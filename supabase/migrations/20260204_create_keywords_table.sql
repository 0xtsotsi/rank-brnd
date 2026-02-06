-- Migration: Create Keywords Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates keywords table for SEO keyword tracking with organization_id, product_id, keyword, search_volume, difficulty, intent, opportunity_score, status

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create keyword status enum type
DO $$ BEGIN
    CREATE TYPE keyword_status AS ENUM ('tracking', 'paused', 'opportunity', 'ignored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create search intent enum type
DO $$ BEGIN
    CREATE TYPE search_intent AS ENUM ('informational', 'navigational', 'transactional', 'commercial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create difficulty level enum type
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('very-easy', 'easy', 'medium', 'hard', 'very-hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create keywords table
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    search_volume INTEGER DEFAULT 0,
    difficulty difficulty_level DEFAULT 'medium'::difficulty_level,
    intent search_intent DEFAULT 'informational'::search_intent,
    opportunity_score INTEGER DEFAULT 0 CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    status keyword_status DEFAULT 'tracking'::keyword_status,
    current_rank INTEGER,
    target_url TEXT,
    cpc NUMERIC(10, 2), -- Cost per click in USD
    competition NUMERIC(3, 2), -- 0-1 scale
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, product_id, keyword)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keywords_organization_id ON keywords(organization_id);
CREATE INDEX IF NOT EXISTS idx_keywords_product_id ON keywords(product_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_status ON keywords(status);
CREATE INDEX IF NOT EXISTS idx_keywords_intent ON keywords(intent);
CREATE INDEX IF NOT EXISTS idx_keywords_difficulty ON keywords(difficulty);
CREATE INDEX IF NOT EXISTS idx_keywords_opportunity_score ON keywords(opportunity_score);
CREATE INDEX IF NOT EXISTS idx_keywords_deleted_at ON keywords(deleted_at);
CREATE INDEX IF NOT EXISTS idx_keywords_org_product ON keywords(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_keywords_tags ON keywords USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_keywords_metadata ON keywords USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_keywords_created_at ON keywords(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_keywords_updated_at ON keywords;
CREATE TRIGGER update_keywords_updated_at
    BEFORE UPDATE ON keywords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to keywords" ON keywords;
DROP POLICY IF EXISTS "Keywords are viewable by organization members" ON keywords;
DROP POLICY IF EXISTS "Keywords can be created by organization members" ON keywords;
DROP POLICY IF EXISTS "Keywords can be updated by organization admins" ON keywords;
DROP POLICY IF EXISTS "Keywords can be deleted by organization owners" ON keywords;

-- RLS Policies for keywords table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to keywords"
ON keywords
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view keywords from their organizations (excluding deleted)
CREATE POLICY "Keywords are viewable by organization members"
ON keywords
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create keywords
CREATE POLICY "Keywords can be created by organization members"
ON keywords
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update keywords
CREATE POLICY "Keywords can be updated by organization admins"
ON keywords
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) keywords
CREATE POLICY "Keywords can be deleted by organization owners"
ON keywords
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = keywords.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete a keyword
CREATE OR REPLACE FUNCTION soft_delete_keyword(p_keyword_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the keyword's organization_id
    SELECT organization_id INTO v_org_id
    FROM keywords
    WHERE id = p_keyword_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is owner
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = p_user_id
    AND role = 'owner';

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Soft delete the keyword
    UPDATE keywords
    SET deleted_at = NOW()
    WHERE id = p_keyword_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get keywords for an organization
CREATE OR REPLACE FUNCTION get_organization_keywords(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    keyword TEXT,
    search_volume INTEGER,
    difficulty difficulty_level,
    intent search_intent,
    opportunity_score INTEGER,
    status keyword_status,
    current_rank INTEGER,
    target_url TEXT,
    cpc NUMERIC(10, 2),
    tags TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            k.id,
            k.keyword,
            k.search_volume,
            k.difficulty,
            k.intent,
            k.opportunity_score,
            k.status,
            k.current_rank,
            k.target_url,
            k.cpc,
            k.tags,
            k.created_at,
            k.updated_at
        FROM keywords k
        WHERE k.organization_id = p_org_id
        AND (p_product_id IS NULL OR k.product_id = p_product_id)
        ORDER BY k.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            k.id,
            k.keyword,
            k.search_volume,
            k.difficulty,
            k.intent,
            k.opportunity_score,
            k.status,
            k.current_rank,
            k.target_url,
            k.cpc,
            k.tags,
            k.created_at,
            k.updated_at
        FROM keywords k
        WHERE k.organization_id = p_org_id
        AND k.deleted_at IS NULL
        AND (p_product_id IS NULL OR k.product_id = p_product_id)
        ORDER BY k.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get keywords for a product
CREATE OR REPLACE FUNCTION get_product_keywords(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    keyword TEXT,
    search_volume INTEGER,
    difficulty difficulty_level,
    intent search_intent,
    opportunity_score INTEGER,
    status keyword_status,
    current_rank INTEGER,
    target_url TEXT,
    cpc NUMERIC(10, 2),
    tags TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            k.id,
            k.keyword,
            k.search_volume,
            k.difficulty,
            k.intent,
            k.opportunity_score,
            k.status,
            k.current_rank,
            k.target_url,
            k.cpc,
            k.tags,
            k.created_at,
            k.updated_at
        FROM keywords k
        WHERE k.product_id = p_product_id
        ORDER BY k.opportunity_score DESC, k.search_volume DESC;
    ELSE
        RETURN QUERY
        SELECT
            k.id,
            k.keyword,
            k.search_volume,
            k.difficulty,
            k.intent,
            k.opportunity_score,
            k.status,
            k.current_rank,
            k.target_url,
            k.cpc,
            k.tags,
            k.created_at,
            k.updated_at
        FROM keywords k
        WHERE k.product_id = p_product_id
        AND k.deleted_at IS NULL
        ORDER BY k.opportunity_score DESC, k.search_volume DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a keyword
CREATE OR REPLACE FUNCTION can_access_keyword(p_keyword_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM keywords k
        JOIN organization_members om ON k.organization_id = om.organization_id
        WHERE k.id = p_keyword_id
        AND om.user_id = p_user_id
        AND k.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate opportunity score
CREATE OR REPLACE FUNCTION calculate_opportunity_score(
    p_search_volume INTEGER,
    p_difficulty difficulty_level,
    p_current_rank INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_volume_score INTEGER;
    v_difficulty_score INTEGER;
    v_rank_score INTEGER;
    v_opportunity_score INTEGER;
BEGIN
    -- Volume score: 0-100 (logarithmic scale)
    IF p_search_volume >= 10000 THEN
        v_volume_score := 100;
    ELSIF p_search_volume >= 5000 THEN
        v_volume_score := 80;
    ELSIF p_search_volume >= 1000 THEN
        v_volume_score := 60;
    ELSIF p_search_volume >= 500 THEN
        v_volume_score := 40;
    ELSIF p_search_volume >= 100 THEN
        v_volume_score := 20;
    ELSE
        v_volume_score := 10;
    END IF;

    -- Difficulty score: 0-100 (inverted - easier is better)
    CASE p_difficulty
        WHEN 'very-easy' THEN v_difficulty_score := 100;
        WHEN 'easy' THEN v_difficulty_score := 75;
        WHEN 'medium' THEN v_difficulty_score := 50;
        WHEN 'hard' THEN v_difficulty_score := 25;
        WHEN 'very-hard' THEN v_difficulty_score := 10;
    END CASE;

    -- Rank score: 0-100 (better rank is better)
    IF p_current_rank IS NULL THEN
        v_rank_score := 50; -- Neutral if not ranked
    ELSIF p_current_rank <= 3 THEN
        v_rank_score := 100;
    ELSIF p_current_rank <= 10 THEN
        v_rank_score := 80;
    ELSIF p_current_rank <= 20 THEN
        v_rank_score := 60;
    ELSIF p_current_rank <= 50 THEN
        v_rank_score := 40;
    ELSE
        v_rank_score := 20;
    END IF;

    -- Calculate weighted average
    v_opportunity_score := (v_volume_score * 0.4 + v_difficulty_score * 0.4 + v_rank_score * 0.2)::INTEGER;

    RETURN v_opportunity_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE keywords IS 'SEO keywords tracked by organizations for their products';
COMMENT ON COLUMN keywords.id IS 'Unique identifier for the keyword';
COMMENT ON COLUMN keywords.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN keywords.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN keywords.keyword IS 'The keyword text being tracked';
COMMENT ON COLUMN keywords.search_volume IS 'Monthly search volume for the keyword';
COMMENT ON COLUMN keywords.difficulty IS 'SEO difficulty level: very-easy, easy, medium, hard, very-hard';
COMMENT ON COLUMN keywords.intent IS 'Search intent: informational, navigational, transactional, commercial';
COMMENT ON COLUMN keywords.opportunity_score IS 'Calculated opportunity score (0-100) based on volume, difficulty, and rank';
COMMENT ON COLUMN keywords.status IS 'Tracking status: tracking, paused, opportunity, ignored';
COMMENT ON COLUMN keywords.current_rank IS 'Current ranking position for this keyword';
COMMENT ON COLUMN keywords.target_url IS 'URL being optimized for this keyword';
COMMENT ON COLUMN keywords.cpc IS 'Cost per click in USD';
COMMENT ON COLUMN keywords.competition IS 'Competition level (0-1 scale)';
COMMENT ON COLUMN keywords.notes IS 'Additional notes about the keyword';
COMMENT ON COLUMN keywords.tags IS 'Tags for categorization and filtering';
COMMENT ON COLUMN keywords.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN keywords.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON keywords TO authenticated;
GRANT ALL ON keywords TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_keyword TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_keywords TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_keywords TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_keyword TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_opportunity_score TO authenticated;
