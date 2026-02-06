-- Migration: Create Competitor Comparisons Table with Multi-Tenancy Support
-- Date: 2026-02-05
-- Description: Creates competitor_comparisons table for comparing user keyword rankings with competitors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create opportunity type enum
DO $$ BEGIN
    CREATE TYPE opportunity_type AS ENUM ('quick-win', 'medium-effort', 'long-term');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create competitor_comparisons table
CREATE TABLE IF NOT EXISTS competitor_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

    -- User ranking data
    user_current_rank INTEGER,
    user_url TEXT,

    -- Competitor ranking data
    competitor_domains TEXT[] DEFAULT '{}',
    competitor_ranks JSONB DEFAULT '{}'::jsonb,
    competitor_urls JSONB DEFAULT '{}'::jsonb,

    -- Gap analysis
    ranking_gaps JSONB DEFAULT '[]'::jsonb,
    gap_to_first_page INTEGER,
    gap_to_top_3 INTEGER,
    gap_to_position_1 INTEGER,

    -- Opportunity assessment
    opportunity_type opportunity_type DEFAULT 'medium-effort',
    opportunity_score INTEGER CHECK (opportunity_score >= 0 AND opportunity_score <= 100),

    -- Competitor strength indicators
    avg_competitor_rank NUMERIC(5, 2),
    strongest_competitor_domain TEXT,
    strongest_competitor_rank INTEGER,

    -- Trend data
    previous_rank INTEGER,
    rank_trend VARCHAR(10) CHECK (rank_trend IN ('up', 'down', 'stable')),

    -- Device and location for this comparison
    device VARCHAR(10) DEFAULT 'desktop',
    location TEXT DEFAULT 'us',

    -- Status tracking
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_organization_id ON competitor_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_product_id ON competitor_comparisons(product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_keyword_id ON competitor_comparisons(keyword_id);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_user_current_rank ON competitor_comparisons(user_current_rank);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_opportunity_type ON competitor_comparisons(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_opportunity_score ON competitor_comparisons(opportunity_score);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_is_active ON competitor_comparisons(is_active);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_device ON competitor_comparisons(device);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_location ON competitor_comparisons(location);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_last_analyzed_at ON competitor_comparisons(last_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_org_product ON competitor_comparisons(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_org_keyword ON competitor_comparisons(organization_id, keyword_id);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_competitor_domains ON competitor_comparisons USING gin(competitor_domains);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_ranking_gaps ON competitor_comparisons USING gin(ranking_gaps);
CREATE INDEX IF NOT EXISTS idx_competitor_comparisons_metadata ON competitor_comparisons USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE competitor_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role has full access to competitor_comparisons" ON competitor_comparisons;
DROP POLICY IF EXISTS "Competitor comparisons are viewable by organization members" ON competitor_comparisons;
DROP POLICY IF EXISTS "Competitor comparisons can be created by organization members" ON competitor_comparisons;
DROP POLICY IF EXISTS "Competitor comparisons can be updated by organization admins" ON competitor_comparisons;
DROP POLICY IF EXISTS "Competitor comparisons can be deleted by organization owners" ON competitor_comparisons;

CREATE POLICY "Service role has full access to competitor_comparisons"
ON competitor_comparisons TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Competitor comparisons are viewable by organization members"
ON competitor_comparisons FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = competitor_comparisons.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

CREATE POLICY "Competitor comparisons can be created by organization members"
ON competitor_comparisons FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = competitor_comparisons.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

CREATE POLICY "Competitor comparisons can be updated by organization admins"
ON competitor_comparisons FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = competitor_comparisons.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = competitor_comparisons.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Competitor comparisons can be deleted by organization owners"
ON competitor_comparisons FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = competitor_comparisons.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to create or update competitor comparison
CREATE OR REPLACE FUNCTION upsert_competitor_comparison(
    p_organization_id UUID,
    p_product_id UUID,
    p_keyword_id UUID,
    p_user_current_rank INTEGER DEFAULT NULL,
    p_user_url TEXT DEFAULT NULL,
    p_competitor_domains TEXT[] DEFAULT NULL,
    p_competitor_ranks JSONB DEFAULT NULL,
    p_competitor_urls JSONB DEFAULT NULL,
    p_opportunity_type opportunity_type DEFAULT 'medium-effort',
    p_opportunity_score INTEGER DEFAULT NULL,
    p_device VARCHAR(10) DEFAULT 'desktop',
    p_location TEXT DEFAULT 'us',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS competitor_comparisons AS $$
DECLARE
    v_result competitor_comparisons;
BEGIN
    INSERT INTO competitor_comparisons (
        organization_id, product_id, keyword_id,
        user_current_rank, user_url,
        competitor_domains, competitor_ranks, competitor_urls,
        opportunity_type, opportunity_score,
        device, location, last_analyzed_at, metadata
    ) VALUES (
        p_organization_id, p_product_id, p_keyword_id,
        p_user_current_rank, p_user_url,
        COALESCE(p_competitor_domains, '{}'::TEXT[]),
        COALESCE(p_competitor_ranks, '{}'::jsonb),
        COALESCE(p_competitor_urls, '{}'::jsonb),
        p_opportunity_type, p_opportunity_score,
        p_device, p_location, NOW(), p_metadata
    )
    ON CONFLICT (keyword_id, device, location)
    DO UPDATE SET
        user_current_rank = EXCLUDED.user_current_rank,
        user_url = EXCLUDED.user_url,
        competitor_domains = EXCLUDED.competitor_domains,
        competitor_ranks = EXCLUDED.competitor_ranks,
        competitor_urls = EXCLUDED.competitor_urls,
        opportunity_type = EXCLUDED.opportunity_type,
        opportunity_score = EXCLUDED.opportunity_score,
        last_analyzed_at = EXCLUDED.last_analyzed_at,
        metadata = EXCLUDED.metadata
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
