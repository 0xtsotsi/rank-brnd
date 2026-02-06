-- Migration: Create SERP Analyses Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates serp_analyses table for storing SERP (Search Engine Results Page) analysis results with organization_id, product_id, keyword_id, competitor_urls, top_10_results, gaps, created_at

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create serp analysis status enum type
DO $$ BEGIN
    CREATE TYPE serp_analysis_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create gap type enum for categorizing content gaps
DO $$ BEGIN
    CREATE TYPE gap_type AS ENUM ('missing_topic', 'weak_content', 'format_mismatch', 'lack_depth', 'outdated', 'no_featured_snippet', 'no_video', 'no_images', 'poor_structure', 'opportunity');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create serp_analyses table
CREATE TABLE IF NOT EXISTS serp_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

    -- SERP analysis data
    query TEXT NOT NULL, -- The search query used for analysis
    device VARCHAR(10) DEFAULT 'desktop', -- desktop, mobile, or tablet
    location TEXT DEFAULT 'us', -- ISO country code

    -- Competitor analysis
    competitor_urls TEXT[] DEFAULT '{}', -- Array of competitor URLs found in SERP
    competitor_domains TEXT[] DEFAULT '{}', -- Unique competitor domains

    -- Top 10 results from SERP
    top_10_results JSONB DEFAULT '[]'::jsonb, -- Array of top 10 results with title, url, description, position

    -- Content gap analysis
    gaps JSONB DEFAULT '[]'::jsonb, -- Array of gap objects with type, description, severity

    -- SERP features
    serp_features JSONB DEFAULT '{}'::jsonb, -- Featured snippet, people also ask, knowledge panel, etc.

    -- Analysis metadata
    search_volume INTEGER DEFAULT 0,
    difficulty_score NUMERIC(3, 2), -- 0-1 scale
    opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),

    -- Status tracking
    status serp_analysis_status DEFAULT 'pending'::serp_analysis_status,
    error_message TEXT,

    -- Recommendations
    recommendations JSONB DEFAULT '[]'::jsonb, -- AI-generated recommendations based on gaps

    -- Timestamps
    analyzed_at TIMESTAMPTZ, -- When the SERP analysis was completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_serp_analyses_organization_id ON serp_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_product_id ON serp_analyses(product_id);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_keyword_id ON serp_analyses(keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_query ON serp_analyses(query);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_status ON serp_analyses(status);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_device ON serp_analyses(device);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_location ON serp_analyses(location);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_opportunity_score ON serp_analyses(opportunity_score);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_analyzed_at ON serp_analyses(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_org_product ON serp_analyses(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_org_keyword ON serp_analyses(organization_id, keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_gaps ON serp_analyses USING gin(gaps);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_serp_features ON serp_analyses USING gin(serp_features);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_metadata ON serp_analyses USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_serp_analyses_created_at ON serp_analyses(created_at);

-- Create unique constraint to prevent duplicate analyses for the same keyword, device, and location
CREATE UNIQUE INDEX IF NOT EXISTS idx_serp_analyses_unique_keyword_device_location
    ON serp_analyses(keyword_id, device, location)
    WHERE analyzed_at IS NOT NULL;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_serp_analyses_updated_at ON serp_analyses;
CREATE TRIGGER update_serp_analyses_updated_at
    BEFORE UPDATE ON serp_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE serp_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to serp_analyses" ON serp_analyses;
DROP POLICY IF EXISTS "SERP analyses are viewable by organization members" ON serp_analyses;
DROP POLICY IF EXISTS "SERP analyses can be created by organization members" ON serp_analyses;
DROP POLICY IF EXISTS "SERP analyses can be updated by organization admins" ON serp_analyses;
DROP POLICY IF EXISTS "SERP analyses can be deleted by organization owners" ON serp_analyses;

-- RLS Policies for serp_analyses table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to serp_analyses"
ON serp_analyses
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view SERP analyses from their organizations
CREATE POLICY "SERP analyses are viewable by organization members"
ON serp_analyses
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = serp_analyses.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create SERP analyses
CREATE POLICY "SERP analyses can be created by organization members"
ON serp_analyses
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = serp_analyses.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update SERP analyses
CREATE POLICY "SERP analyses can be updated by organization admins"
ON serp_analyses
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = serp_analyses.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = serp_analyses.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete SERP analyses
CREATE POLICY "SERP analyses can be deleted by organization owners"
ON serp_analyses
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = serp_analyses.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to create or update SERP analysis
CREATE OR REPLACE FUNCTION upsert_serp_analysis(
    p_organization_id UUID,
    p_product_id UUID,
    p_keyword_id UUID,
    p_query TEXT,
    p_device VARCHAR(10) DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us',
    p_competitor_urls TEXT[] DEFAULT NULL,
    p_top_10_results JSONB DEFAULT NULL,
    p_gaps JSONB DEFAULT NULL,
    p_serp_features JSONB DEFAULT NULL,
    p_search_volume INTEGER DEFAULT 0,
    p_difficulty_score NUMERIC DEFAULT NULL,
    p_opportunity_score INTEGER DEFAULT NULL,
    p_recommendations JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS serp_analyses AS $$
DECLARE
    v_result serp_analyses;
BEGIN
    INSERT INTO serp_analyses (
        organization_id,
        product_id,
        keyword_id,
        query,
        device,
        location,
        competitor_urls,
        top_10_results,
        gaps,
        serp_features,
        search_volume,
        difficulty_score,
        opportunity_score,
        status,
        recommendations,
        analyzed_at,
        metadata
    ) VALUES (
        p_organization_id,
        p_product_id,
        p_keyword_id,
        p_query,
        p_device,
        p_location,
        COALESCE(p_competitor_urls, '{}'::TEXT[]),
        COALESCE(p_top_10_results, '[]'::jsonb),
        COALESCE(p_gaps, '[]'::jsonb),
        COALESCE(p_serp_features, '{}'::jsonb),
        p_search_volume,
        p_difficulty_score,
        p_opportunity_score,
        'completed'::serp_analysis_status,
        COALESCE(p_recommendations, '[]'::jsonb),
        NOW(),
        p_metadata
    )
    ON CONFLICT (keyword_id, device, location) WHERE analyzed_at IS NOT NULL
    DO UPDATE SET
        query = EXCLUDED.query,
        competitor_urls = EXCLUDED.competitor_urls,
        competitor_domains = ARRAY(SELECT DISTINCT unnest(EXCLUDED.competitor_urls)),
        top_10_results = EXCLUDED.top_10_results,
        gaps = EXCLUDED.gaps,
        serp_features = EXCLUDED.serp_features,
        search_volume = EXCLUDED.search_volume,
        difficulty_score = EXCLUDED.difficulty_score,
        opportunity_score = EXCLUDED.opportunity_score,
        status = EXCLUDED.status,
        recommendations = EXCLUDED.recommendations,
        analyzed_at = EXCLUDED.analyzed_at,
        metadata = EXCLUDED.metadata
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get SERP analysis for a keyword
CREATE OR REPLACE FUNCTION get_keyword_serp_analysis(
    p_keyword_id UUID,
    p_device VARCHAR(10) DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us'
)
RETURNS TABLE (
    id UUID,
    query TEXT,
    device VARCHAR(10),
    location TEXT,
    competitor_urls TEXT[],
    competitor_domains TEXT[],
    top_10_results JSONB,
    gaps JSONB,
    serp_features JSONB,
    search_volume INTEGER,
    difficulty_score NUMERIC,
    opportunity_score INTEGER,
    status serp_analysis_status,
    recommendations JSONB,
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sa.query,
        sa.device,
        sa.location,
        sa.competitor_urls,
        sa.competitor_domains,
        sa.top_10_results,
        sa.gaps,
        sa.serp_features,
        sa.search_volume,
        sa.difficulty_score,
        sa.opportunity_score,
        sa.status,
        sa.recommendations,
        sa.analyzed_at,
        sa.created_at
    FROM serp_analyses sa
    WHERE sa.keyword_id = p_keyword_id
    AND sa.device = p_device
    AND sa.location = p_location
    ORDER BY sa.analyzed_at DESC NULLS LAST, sa.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get SERP analyses for a product
CREATE OR REPLACE FUNCTION get_product_serp_analyses(
    p_product_id UUID,
    p_device VARCHAR(10) DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    keyword_id UUID,
    query TEXT,
    device VARCHAR(10),
    location TEXT,
    competitor_urls TEXT[],
    gaps JSONB,
    opportunity_score INTEGER,
    status serp_analysis_status,
    analyzed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sa.keyword_id,
        sa.query,
        sa.device,
        sa.location,
        sa.competitor_urls,
        sa.gaps,
        sa.opportunity_score,
        sa.status,
        sa.analyzed_at
    FROM serp_analyses sa
    WHERE sa.product_id = p_product_id
    AND (p_device IS NULL OR sa.device = p_device)
    AND (p_location IS NULL OR sa.location = p_location)
    ORDER BY sa.analyzed_at DESC NULLS LAST, sa.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get SERP analyses for an organization
CREATE OR REPLACE FUNCTION get_organization_serp_analyses(
    p_organization_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_device VARCHAR(10) DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    keyword_id UUID,
    query TEXT,
    device VARCHAR(10),
    location TEXT,
    competitor_urls TEXT[],
    gaps JSONB,
    opportunity_score INTEGER,
    status serp_analysis_status,
    analyzed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.id,
        sa.product_id,
        sa.keyword_id,
        sa.query,
        sa.device,
        sa.location,
        sa.competitor_urls,
        sa.gaps,
        sa.opportunity_score,
        sa.status,
        sa.analyzed_at
    FROM serp_analyses sa
    WHERE sa.organization_id = p_organization_id
    AND (p_product_id IS NULL OR sa.product_id = p_product_id)
    AND (p_device IS NULL OR sa.device = p_device)
    AND (p_location IS NULL OR sa.location = p_location)
    ORDER BY sa.analyzed_at DESC NULLS LAST, sa.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a SERP analysis
CREATE OR REPLACE FUNCTION can_access_serp_analysis(p_serp_analysis_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM serp_analyses sa
        JOIN organization_members om ON sa.organization_id = om.organization_id
        WHERE sa.id = p_serp_analysis_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate SERP opportunity score
CREATE OR REPLACE FUNCTION calculate_serp_opportunity_score(
    p_gaps JSONB,
    p_search_volume INTEGER,
    p_difficulty_score NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
    v_gap_count INTEGER;
    v_gap_severity_score INTEGER;
    v_volume_score INTEGER;
    v_difficulty_score INTEGER;
    v_opportunity_score INTEGER;
BEGIN
    -- Count gaps and calculate severity
    SELECT jsonb_array_length(p_gaps) INTO v_gap_count;
    IF v_gap_count IS NULL THEN
        v_gap_count := 0;
    END IF;

    -- Gap severity score: more gaps = higher opportunity
    v_gap_severity_score := LEAST(v_gap_count * 10, 50);

    -- Volume score: 0-50
    IF p_search_volume >= 10000 THEN
        v_volume_score := 50;
    ELSIF p_search_volume >= 5000 THEN
        v_volume_score := 40;
    ELSIF p_search_volume >= 1000 THEN
        v_volume_score := 30;
    ELSIF p_search_volume >= 500 THEN
        v_volume_score := 20;
    ELSIF p_search_volume >= 100 THEN
        v_volume_score := 10;
    ELSE
        v_volume_score := 5;
    END IF;

    -- Difficulty score: lower difficulty = higher opportunity (0-50 scale inverted)
    IF p_difficulty_score IS NOT NULL THEN
        v_difficulty_score := ((1.0 - p_difficulty_score) * 50)::INTEGER;
    ELSE
        v_difficulty_score := 25;
    END IF;

    -- Calculate total opportunity score (0-100)
    v_opportunity_score := LEAST(v_gap_severity_score + v_volume_score + v_difficulty_score, 100);

    RETURN v_opportunity_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE serp_analyses IS 'SERP (Search Engine Results Page) analyses for keywords with competitor insights and content gap detection';
COMMENT ON COLUMN serp_analyses.id IS 'Unique identifier for the SERP analysis';
COMMENT ON COLUMN serp_analyses.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN serp_analyses.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN serp_analyses.keyword_id IS 'Reference to the keyword being analyzed';
COMMENT ON COLUMN serp_analyses.query IS 'The search query used for SERP analysis';
COMMENT ON COLUMN serp_analyses.device IS 'Device type used for analysis: desktop, mobile, or tablet';
COMMENT ON COLUMN serp_analyses.location IS 'ISO country code for location-specific analysis (e.g., "us" for United States)';
COMMENT ON COLUMN serp_analyses.competitor_urls IS 'Array of competitor URLs found in SERP';
COMMENT ON COLUMN serp_analyses.competitor_domains IS 'Unique competitor domains extracted from URLs';
COMMENT ON COLUMN serp_analyses.top_10_results IS 'JSON array of top 10 search results with title, url, description, and position';
COMMENT ON COLUMN serp_analyses.gaps IS 'JSON array of identified content gaps with type, description, and severity';
COMMENT ON COLUMN serp_analyses.serp_features IS 'JSON object of detected SERP features (featured snippet, people also ask, knowledge panel, etc.)';
COMMENT ON COLUMN serp_analyses.search_volume IS 'Monthly search volume for the keyword';
COMMENT ON COLUMN serp_analyses.difficulty_score IS 'Keyword difficulty score on 0-1 scale';
COMMENT ON COLUMN serp_analyses.opportunity_score IS 'Calculated opportunity score (0-100) based on gaps, volume, and difficulty';
COMMENT ON COLUMN serp_analyses.status IS 'Analysis status: pending, analyzing, completed, or failed';
COMMENT ON COLUMN serp_analyses.error_message IS 'Error message if analysis failed';
COMMENT ON COLUMN serp_analyses.recommendations IS 'AI-generated recommendations based on identified gaps';
COMMENT ON COLUMN serp_analyses.analyzed_at IS 'Timestamp when the SERP analysis was completed';
COMMENT ON COLUMN serp_analyses.metadata IS 'Additional metadata as JSON';

-- Grant necessary permissions
GRANT ALL ON serp_analyses TO authenticated;
GRANT ALL ON serp_analyses TO service_role;
GRANT EXECUTE ON FUNCTION upsert_serp_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_serp_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_serp_analyses TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_serp_analyses TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_serp_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_serp_opportunity_score TO authenticated;
