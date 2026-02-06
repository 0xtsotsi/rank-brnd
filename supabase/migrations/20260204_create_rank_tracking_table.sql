-- Migration: Create Rank Tracking Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates rank_tracking table for storing historical rank position data with organization_id, product_id, keyword_id, position, device, location, date

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create device type enum for rank tracking
DO $$ BEGIN
    CREATE TYPE rank_device AS ENUM ('desktop', 'mobile', 'tablet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create rank_tracking table
CREATE TABLE IF NOT EXISTS rank_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position > 0),
    device rank_device DEFAULT 'desktop'::rank_device,
    location TEXT DEFAULT 'us', -- ISO country code, 'us' for United States, null for global
    url TEXT, -- The ranked URL for this position
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    search_volume INTEGER DEFAULT 0,
    ctr NUMERIC(5, 4), -- Click-through rate (0-1)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure we don't have duplicate records for the same keyword, device, location, and date
    UNIQUE(keyword_id, device, location, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rank_tracking_organization_id ON rank_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_product_id ON rank_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_keyword_id ON rank_tracking(keyword_id);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_position ON rank_tracking(position);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_device ON rank_tracking(device);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_location ON rank_tracking(location);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_date ON rank_tracking(date);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_org_product ON rank_tracking(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_keyword_device_date ON rank_tracking(keyword_id, device, date);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_metadata ON rank_tracking USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_created_at ON rank_tracking(created_at);

-- Enable Row Level Security
ALTER TABLE rank_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to rank_tracking" ON rank_tracking;
DROP POLICY IF EXISTS "Rank tracking is viewable by organization members" ON rank_tracking;
DROP POLICY IF EXISTS "Rank tracking can be created by organization members" ON rank_tracking;

-- RLS Policies for rank_tracking table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to rank_tracking"
ON rank_tracking
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view rank tracking data from their organizations
CREATE POLICY "Rank tracking is viewable by organization members"
ON rank_tracking
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = rank_tracking.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create rank tracking records
CREATE POLICY "Rank tracking can be created by organization members"
ON rank_tracking
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = rank_tracking.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Helper function to get rank history for a keyword
CREATE OR REPLACE FUNCTION get_keyword_rank_history(
    p_keyword_id UUID,
    p_device rank_device DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us',
    p_days INTEGER DEFAULT 30,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    position INTEGER,
    url TEXT,
    date DATE,
    search_volume INTEGER,
    ctr NUMERIC(5, 4),
    impressions INTEGER,
    clicks INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.id,
        rt.position,
        rt.url,
        rt.date,
        rt.search_volume,
        rt.ctr,
        rt.impressions,
        rt.clicks,
        rt.created_at
    FROM rank_tracking rt
    WHERE rt.keyword_id = p_keyword_id
    AND rt.device = p_device
    AND rt.location = p_location
    AND rt.date >= p_end_date - (p_days || ' days')::interval
    AND rt.date <= p_end_date
    ORDER BY rt.date ASC, rt.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current rank for a keyword
CREATE OR REPLACE FUNCTION get_keyword_current_rank(
    p_keyword_id UUID,
    p_device rank_device DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us'
)
RETURNS TABLE (
    keyword_id UUID,
    position INTEGER,
    url TEXT,
    date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.keyword_id,
        rt.position,
        rt.url,
        rt.date
    FROM rank_tracking rt
    WHERE rt.keyword_id = p_keyword_id
    AND rt.device = p_device
    AND rt.location = p_location
    ORDER BY rt.date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to insert or update rank tracking record (upsert by unique constraint)
CREATE OR REPLACE FUNCTION upsert_rank_tracking(
    p_organization_id UUID,
    p_product_id UUID,
    p_keyword_id UUID,
    p_position INTEGER,
    p_device rank_device DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us',
    p_url TEXT DEFAULT NULL,
    p_date DATE DEFAULT CURRENT_DATE,
    p_search_volume INTEGER DEFAULT 0,
    p_ctr NUMERIC DEFAULT NULL,
    p_impressions INTEGER DEFAULT 0,
    p_clicks INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS rank_tracking AS $$
DECLARE
    v_result rank_tracking;
BEGIN
    INSERT INTO rank_tracking (
        organization_id,
        product_id,
        keyword_id,
        position,
        device,
        location,
        url,
        date,
        search_volume,
        ctr,
        impressions,
        clicks,
        metadata
    ) VALUES (
        p_organization_id,
        p_product_id,
        p_keyword_id,
        p_position,
        p_device,
        p_location,
        p_url,
        p_date,
        p_search_volume,
        p_ctr,
        p_impressions,
        p_clicks,
        p_metadata
    )
    ON CONFLICT (keyword_id, device, location, date)
    DO UPDATE SET
        position = EXCLUDED.position,
        url = EXCLUDED.url,
        search_volume = EXCLUDED.search_volume,
        ctr = EXCLUDED.ctr,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        metadata = EXCLUDED.metadata
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get rank statistics for a keyword
CREATE OR REPLACE FUNCTION get_keyword_rank_stats(
    p_keyword_id UUID,
    p_device rank_device DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us',
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    avg_position NUMERIC,
    min_position INTEGER,
    max_position INTEGER,
    current_position INTEGER,
    position_change INTEGER,
    total_records BIGINT,
    first_tracked DATE,
    last_tracked DATE
) AS $$
DECLARE
    v_current_pos INTEGER;
    v_previous_pos INTEGER;
BEGIN
    -- Get current and previous positions
    SELECT position INTO v_current_pos
    FROM rank_tracking
    WHERE keyword_id = p_keyword_id
    AND device = p_device
    AND location = p_location
    ORDER BY date DESC
    LIMIT 1;

    SELECT position INTO v_previous_pos
    FROM rank_tracking
    WHERE keyword_id = p_keyword_id
    AND device = p_device
    AND location = p_location
    AND date < (
        SELECT COALESCE(MAX(date), CURRENT_DATE)
        FROM rank_tracking
        WHERE keyword_id = p_keyword_id
        AND device = p_device
        AND location = p_location
    )
    ORDER BY date DESC
    LIMIT 1;

    RETURN QUERY
    SELECT
        AVG(rt.position)::NUMERIC as avg_position,
        MIN(rt.position) as min_position,
        MAX(rt.position) as max_position,
        v_current_pos as current_position,
        CASE
            WHEN v_previous_pos IS NOT NULL THEN v_current_pos - v_previous_pos
            ELSE NULL
        END as position_change,
        COUNT(*)::BIGINT as total_records,
        MIN(rt.date) as first_tracked,
        MAX(rt.date) as last_tracked
    FROM rank_tracking rt
    WHERE rt.keyword_id = p_keyword_id
    AND rt.device = p_device
    AND rt.location = p_location
    AND rt.date >= CURRENT_DATE - (p_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to bulk insert rank tracking records
CREATE OR REPLACE FUNCTION bulk_insert_rank_tracking(
    p_records JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_record JSONB;
    v_result rank_tracking;
BEGIN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        BEGIN
            INSERT INTO rank_tracking (
                organization_id,
                product_id,
                keyword_id,
                position,
                device,
                location,
                url,
                date,
                search_volume,
                ctr,
                impressions,
                clicks,
                metadata
            ) VALUES (
                v_record->>'organization_id',
                v_record->>'product_id',
                v_record->>'keyword_id',
                (v_record->>'position')::INTEGER,
                (v_record->>'device')::rank_device,
                v_record->>'location',
                v_record->>'url',
                (v_record->>'date')::DATE,
                COALESCE((v_record->>'search_volume')::INTEGER, 0),
                (v_record->>'ctr')::NUMERIC,
                COALESCE((v_record->>'impressions')::INTEGER, 0),
                COALESCE((v_record->>'clicks')::INTEGER, 0),
                COALESCE(v_record->>'metadata', '{}'::jsonb)
            )
            ON CONFLICT (keyword_id, device, location, date) DO NOTHING
            RETURNING * INTO v_result;

            RETURN QUERY SELECT TRUE, v_result.id, NULL::TEXT;
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
        END;
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access rank tracking data
CREATE OR REPLACE FUNCTION can_access_rank_tracking(p_rank_tracking_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM rank_tracking rt
        JOIN organization_members om ON rt.organization_id = om.organization_id
        WHERE rt.id = p_rank_tracking_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE rank_tracking IS 'Historical rank position tracking for keywords across devices and locations';
COMMENT ON COLUMN rank_tracking.id IS 'Unique identifier for the rank tracking record';
COMMENT ON COLUMN rank_tracking.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN rank_tracking.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN rank_tracking.keyword_id IS 'Reference to the keyword being tracked';
COMMENT ON COLUMN rank_tracking.position IS 'Search ranking position (1 = top position)';
COMMENT ON COLUMN rank_tracking.device IS 'Device type: desktop, mobile, or tablet';
COMMENT ON COLUMN rank_tracking.location IS 'ISO country code for location-specific rankings (e.g., "us" for United States)';
COMMENT ON COLUMN rank_tracking.url IS 'The ranked URL for this position';
COMMENT ON COLUMN rank_tracking.date IS 'Date of the rank measurement';
COMMENT ON COLUMN rank_tracking.search_volume IS 'Monthly search volume for the keyword';
COMMENT ON COLUMN rank_tracking.ctr IS 'Click-through rate (0-1 scale)';
COMMENT ON COLUMN rank_tracking.impressions IS 'Number of impressions';
COMMENT ON COLUMN rank_tracking.clicks IS 'Number of clicks';
COMMENT ON COLUMN rank_tracking.metadata IS 'Additional metadata as JSON';

-- Grant necessary permissions
GRANT ALL ON rank_tracking TO authenticated;
GRANT ALL ON rank_tracking TO service_role;
GRANT EXECUTE ON FUNCTION get_keyword_rank_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_current_rank TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_rank_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_rank_stats TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_insert_rank_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_rank_tracking TO authenticated;
