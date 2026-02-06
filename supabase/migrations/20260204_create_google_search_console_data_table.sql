-- Migration: Create Google Search Console Data Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates google_search_console_data table for storing search performance metrics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create google_search_console_data table
CREATE TABLE IF NOT EXISTS google_search_console_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    ctr NUMERIC(10, 4) NOT NULL DEFAULT 0,
    avg_position NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, product_id, keyword, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_organization_id ON google_search_console_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_product_id ON google_search_console_data(product_id);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_keyword ON google_search_console_data(keyword);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_date ON google_search_console_data(date);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_org_product_date ON google_search_console_data(organization_id, product_id, date);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_impressions ON google_search_console_data(impressions);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_clicks ON google_search_console_data(clicks);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_created_at ON google_search_console_data(created_at);
CREATE INDEX IF NOT EXISTS idx_google_search_console_data_metadata ON google_search_console_data USING gin(metadata);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_google_search_console_data_updated_at ON google_search_console_data;
CREATE TRIGGER update_google_search_console_data_updated_at
    BEFORE UPDATE ON google_search_console_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE google_search_console_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to google_search_console_data" ON google_search_console_data;
DROP POLICY IF EXISTS "Google Search Console data is viewable by organization members" ON google_search_console_data;
DROP POLICY IF EXISTS "Google Search Console data can be created by organization members" ON google_search_console_data;
DROP POLICY IF EXISTS "Google Search Console data can be updated by organization admins" ON google_search_console_data;
DROP POLICY IF EXISTS "Google Search Console data can be deleted by organization owners" ON google_search_console_data;

-- RLS Policies for google_search_console_data table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to google_search_console_data"
ON google_search_console_data
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view Google Search Console data from their organizations
CREATE POLICY "Google Search Console data is viewable by organization members"
ON google_search_console_data
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = google_search_console_data.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create Google Search Console data
CREATE POLICY "Google Search Console data can be created by organization members"
ON google_search_console_data
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = google_search_console_data.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update Google Search Console data
CREATE POLICY "Google Search Console data can be updated by organization admins"
ON google_search_console_data
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = google_search_console_data.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = google_search_console_data.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete Google Search Console data
CREATE POLICY "Google Search Console data can be deleted by organization owners"
ON google_search_console_data
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = google_search_console_data.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get Google Search Console data for a product
CREATE OR REPLACE FUNCTION get_product_search_console_data(
    p_product_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    product_id UUID,
    keyword TEXT,
    impressions INTEGER,
    clicks INTEGER,
    ctr NUMERIC,
    avg_position NUMERIC,
    date DATE,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gscd.id,
        gscd.organization_id,
        gscd.product_id,
        gscd.keyword,
        gscd.impressions,
        gscd.clicks,
        gscd.ctr,
        gscd.avg_position,
        gscd.date,
        gscd.created_at
    FROM google_search_console_data gscd
    WHERE gscd.product_id = p_product_id
    AND (p_start_date IS NULL OR gscd.date >= p_start_date)
    AND (p_end_date IS NULL OR gscd.date <= p_end_date)
    ORDER BY gscd.date DESC, gscd.impressions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access Google Search Console data
CREATE OR REPLACE FUNCTION can_access_search_console_data(p_data_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM google_search_console_data gscd
        JOIN organization_members om ON gscd.organization_id = om.organization_id
        WHERE gscd.id = p_data_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to bulk upsert Google Search Console data
CREATE OR REPLACE FUNCTION upsert_search_console_data(
    p_organization_id UUID,
    p_product_id UUID,
    p_data JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_inserted_count INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Iterate through the data array and upsert each record
    FOR v_record IN
        SELECT * FROM jsonb_array_elements(p_data)
    LOOP
        INSERT INTO google_search_console_data (
            organization_id,
            product_id,
            keyword,
            impressions,
            clicks,
            ctr,
            avg_position,
            date,
            metadata
        )
        VALUES (
            p_organization_id,
            p_product_id,
            v_record.value->>'keyword',
            COALESCE((v_record.value->>'impressions')::INTEGER, 0),
            COALESCE((v_record.value->>'clicks')::INTEGER, 0),
            COALESCE((v_record.value->>'ctr')::NUMERIC, 0),
            COALESCE((v_record.value->>'avg_position')::NUMERIC, 0),
            (v_record.value->>'date')::DATE,
            COALESCE(v_record.value->'metadata', '{}'::jsonb)
        )
        ON CONFLICT (organization_id, product_id, keyword, date)
        DO UPDATE SET
            impressions = EXCLUDED.impressions,
            clicks = EXCLUDED.clicks,
            ctr = EXCLUDED.ctr,
            avg_position = EXCLUDED.avg_position,
            metadata = EXCLUDED.metadata,
            updated_at = NOW();

        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get aggregated metrics for a product
CREATE OR REPLACE FUNCTION get_product_search_console_metrics(
    p_product_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_impressions BIGINT,
    total_clicks BIGINT,
    avg_ctr NUMERIC,
    avg_position NUMERIC,
    unique_keywords INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(gscd.impressions), 0)::BIGINT as total_impressions,
        COALESCE(SUM(gscd.clicks), 0)::BIGINT as total_clicks,
        CASE
            WHEN SUM(gscd.impressions) > 0 THEN
                ROUND((SUM(gscd.ctr * gscd.impressions) / NULLIF(SUM(gscd.impressions), 0))::NUMERIC, 4)
            ELSE 0
        END as avg_ctr,
        ROUND(AVG(gscd.avg_position)::NUMERIC, 2) as avg_position,
        COUNT(DISTINCT gscd.keyword) as unique_keywords
    FROM google_search_console_data gscd
    WHERE gscd.product_id = p_product_id
    AND (p_start_date IS NULL OR gscd.date >= p_start_date)
    AND (p_end_date IS NULL OR gscd.date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE google_search_console_data IS 'Google Search Console performance data for tracking keyword metrics';
COMMENT ON COLUMN google_search_console_data.id IS 'Unique identifier for the search console data record';
COMMENT ON COLUMN google_search_console_data.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN google_search_console_data.product_id IS 'Reference to the product/website';
COMMENT ON COLUMN google_search_console_data.keyword IS 'The search query/keyword';
COMMENT ON COLUMN google_search_console_data.impressions IS 'Number of times the URL appeared in search results';
COMMENT ON COLUMN google_search_console_data.clicks IS 'Number of times the URL was clicked';
COMMENT ON COLUMN google_search_console_data.ctr IS 'Click-through rate (clicks / impressions)';
COMMENT ON COLUMN google_search_console_data.avg_position IS 'Average position in search results';
COMMENT ON COLUMN google_search_console_data.date IS 'Date of the search performance data';
COMMENT ON COLUMN google_search_console_data.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN google_search_console_data.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN google_search_console_data.updated_at IS 'Timestamp when the record was last updated';

-- Grant necessary permissions
GRANT ALL ON google_search_console_data TO authenticated;
GRANT ALL ON google_search_console_data TO service_role;
GRANT EXECUTE ON FUNCTION get_product_search_console_data TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_search_console_data TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_search_console_data TO service_role;
GRANT EXECUTE ON FUNCTION get_product_search_console_metrics TO authenticated;
