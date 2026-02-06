-- Migration: Create Article Outlines Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates article_outlines table for storing AI-generated article outlines with organization_id, product_id, keyword_id, outline structure, SERP insights, brand voice applied

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create article outline status enum type
DO $$ BEGIN
    CREATE TYPE article_outline_status AS ENUM ('pending', 'generating', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create article outline content type enum
DO $$ BEGIN
    CREATE TYPE article_outline_content_type AS ENUM (
        'blog_post', 'guide', 'tutorial', 'listicle', 'review',
        'comparison', 'case_study', 'news_article', 'opinion', 'faq', 'how_to'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create article_outlines table
CREATE TABLE IF NOT EXISTS article_outlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id TEXT,
    keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,

    -- Outline input data
    keyword TEXT NOT NULL,
    content_type article_outline_content_type DEFAULT 'blog_post'::article_outline_content_type,
    target_audience TEXT,
    detail_level TEXT DEFAULT 'standard',
    target_word_count INTEGER,
    section_count INTEGER,

    -- Generated outline structure (JSONB with H1/H2/H3 hierarchy)
    outline JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- SERP integration results
    serp_insights JSONB,
    serp_analysis_id UUID REFERENCES serp_analyses(id) ON DELETE SET NULL,

    -- Brand voice integration
    brand_voice_applied JSONB,
    brand_voice_sample_id UUID,

    -- SEO recommendations
    seo_recommendations TEXT[] DEFAULT '{}',

    -- Word count tracking
    estimated_word_count INTEGER NOT NULL DEFAULT 0,

    -- Status tracking
    status article_outline_status DEFAULT 'pending'::article_outline_status,
    error_message TEXT,

    -- Generation metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_outlines_organization_id ON article_outlines(organization_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_product_id ON article_outlines(product_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_keyword_id ON article_outlines(keyword_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_user_id ON article_outlines(user_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_keyword ON article_outlines(keyword);
CREATE INDEX IF NOT EXISTS idx_article_outlines_content_type ON article_outlines(content_type);
CREATE INDEX IF NOT EXISTS idx_article_outlines_status ON article_outlines(status);
CREATE INDEX IF NOT EXISTS idx_article_outlines_serp_analysis_id ON article_outlines(serp_analysis_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_org_product ON article_outlines(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_org_keyword ON article_outlines(organization_id, keyword_id);
CREATE INDEX IF NOT EXISTS idx_article_outlines_outline ON article_outlines USING gin(outline);
CREATE INDEX IF NOT EXISTS idx_article_outlines_serp_insights ON article_outlines USING gin(serp_insights);
CREATE INDEX IF NOT EXISTS idx_article_outlines_brand_voice_applied ON article_outlines USING gin(brand_voice_applied);
CREATE INDEX IF NOT EXISTS idx_article_outlines_metadata ON article_outlines USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_article_outlines_seo_recommendations ON article_outlines USING gin(seo_recommendations);
CREATE INDEX IF NOT EXISTS idx_article_outlines_created_at ON article_outlines(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_article_outlines_updated_at ON article_outlines;
CREATE TRIGGER update_article_outlines_updated_at
    BEFORE UPDATE ON article_outlines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE article_outlines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to article_outlines" ON article_outlines;
DROP POLICY IF EXISTS "Article outlines are viewable by organization members" ON article_outlines;
DROP POLICY IF EXISTS "Article outlines can be created by organization members" ON article_outlines;
DROP POLICY IF EXISTS "Article outlines can be updated by organization admins" ON article_outlines;
DROP POLICY IF EXISTS "Article outlines can be deleted by organization owners" ON article_outlines;

-- RLS Policies for article_outlines table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to article_outlines"
ON article_outlines
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view article outlines from their organizations
CREATE POLICY "Article outlines are viewable by organization members"
ON article_outlines
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = article_outlines.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create article outlines
CREATE POLICY "Article outlines can be created by organization members"
ON article_outlines
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = article_outlines.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update article outlines
CREATE POLICY "Article outlines can be updated by organization admins"
ON article_outlines
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = article_outlines.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = article_outlines.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete article outlines
CREATE POLICY "Article outlines can be deleted by organization owners"
ON article_outlines
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = article_outlines.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get article outlines for an organization
CREATE OR REPLACE FUNCTION get_organization_article_outlines(
    p_org_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_keyword_id UUID DEFAULT NULL,
    p_content_type article_outline_content_type DEFAULT NULL,
    p_status article_outline_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    keyword TEXT,
    content_type article_outline_content_type,
    status article_outline_status,
    estimated_word_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ao.id,
        ao.keyword,
        ao.content_type,
        ao.status,
        ao.estimated_word_count,
        ao.created_at,
        ao.updated_at
    FROM article_outlines ao
    WHERE ao.organization_id = p_org_id
    AND (p_product_id IS NULL OR ao.product_id = p_product_id)
    AND (p_keyword_id IS NULL OR ao.keyword_id = p_keyword_id)
    AND (p_content_type IS NULL OR ao.content_type = p_content_type)
    AND (p_status IS NULL OR ao.status = p_status)
    ORDER BY ao.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get article outlines for a keyword
CREATE OR REPLACE FUNCTION get_keyword_article_outlines(
    p_keyword_id UUID,
    p_status article_outline_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    keyword TEXT,
    content_type article_outline_content_type,
    status article_outline_status,
    outline JSONB,
    estimated_word_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ao.id,
        ao.organization_id,
        ao.keyword,
        ao.content_type,
        ao.status,
        ao.outline,
        ao.estimated_word_count,
        ao.created_at
    FROM article_outlines ao
    WHERE ao.keyword_id = p_keyword_id
    AND (p_status IS NULL OR ao.status = p_status)
    ORDER BY ao.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get the latest completed outline for a keyword
CREATE OR REPLACE FUNCTION get_latest_article_outline(
    p_keyword_id UUID
)
RETURNS article_outlines AS $$
DECLARE
    v_result article_outlines;
BEGIN
    SELECT * INTO v_result
    FROM article_outlines
    WHERE keyword_id = p_keyword_id
    AND status = 'completed'::article_outline_status
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an article outline
CREATE OR REPLACE FUNCTION can_access_article_outline(p_outline_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM article_outlines ao
        JOIN organization_members om ON ao.organization_id = om.organization_id
        WHERE ao.id = p_outline_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update article outline status
CREATE OR REPLACE FUNCTION update_article_outline_status(
    p_outline_id UUID,
    p_status article_outline_status,
    p_error_message TEXT DEFAULT NULL
)
RETURNS article_outlines AS $$
DECLARE
    v_result article_outlines;
BEGIN
    UPDATE article_outlines
    SET status = p_status,
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_outline_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get article outline statistics for an organization
CREATE OR REPLACE FUNCTION get_article_outline_stats(
    p_org_id UUID,
    p_product_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total BIGINT,
    by_status JSONB,
    by_content_type JSONB,
    avg_estimated_word_count NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        jsonb_object_agg(
            COALESCE(status, 'unknown'),
            status_count
        ) AS by_status,
        jsonb_object_agg(
            COALESCE(content_type::TEXT, 'unknown'),
            content_type_count
        ) AS by_content_type,
        AVG(estimated_word_count)::NUMERIC AS avg_estimated_word_count
    FROM (
        SELECT
            status,
            content_type,
            estimated_word_count
        FROM article_outlines
        WHERE organization_id = p_org_id
        AND (p_product_id IS NULL OR product_id = p_product_id)
    ) AS subq
    CROSS JOIN (
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'generating') AS generating,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'failed') AS failed,
            COUNT(*) FILTER (WHERE content_type = 'blog_post') AS blog_post,
            COUNT(*) FILTER (WHERE content_type = 'guide') AS guide,
            COUNT(*) FILTER (WHERE content_type = 'tutorial') AS tutorial,
            COUNT(*) FILTER (WHERE content_type = 'listicle') AS listicle,
            COUNT(*) FILTER (WHERE content_type = 'review') AS review,
            COUNT(*) FILTER (WHERE content_type = 'comparison') AS comparison,
            COUNT(*) FILTER (WHERE content_type = 'case_study') AS case_study,
            COUNT(*) FILTER (WHERE content_type = 'news_article') AS news_article,
            COUNT(*) FILTER (WHERE content_type = 'opinion') AS opinion,
            COUNT(*) FILTER (WHERE content_type = 'faq') AS faq,
            COUNT(*) FILTER (WHERE content_type = 'how_to') AS how_to
        FROM article_outlines
        WHERE organization_id = p_org_id
        AND (p_product_id IS NULL OR product_id = p_product_id)
    ) AS counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE article_outlines IS 'AI-generated article outlines with H1/H2/H3 hierarchy, integrated with SERP analysis and brand voice';
COMMENT ON COLUMN article_outlines.id IS 'Unique identifier for the article outline';
COMMENT ON COLUMN article_outlines.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN article_outlines.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN article_outlines.user_id IS 'ID of the user who created the outline';
COMMENT ON COLUMN article_outlines.keyword_id IS 'Reference to the primary keyword this outline targets';
COMMENT ON COLUMN article_outlines.keyword IS 'The primary keyword/phrase for the outline';
COMMENT ON COLUMN article_outlines.content_type IS 'Type of content: blog_post, guide, tutorial, listicle, review, comparison, case_study, news_article, opinion, faq, how_to';
COMMENT ON COLUMN article_outlines.target_audience IS 'Description of the target audience';
COMMENT ON COLUMN article_outlines.detail_level IS 'Detail level: basic, standard, or comprehensive';
COMMENT ON COLUMN article_outlines.target_word_count IS 'Target word count for the article';
COMMENT ON COLUMN article_outlines.section_count IS 'Number of H2 sections to generate';
COMMENT ON COLUMN article_outlines.outline IS 'Generated outline structure with H1, H2, H3 headings and metadata as JSONB';
COMMENT ON COLUMN article_outlines.serp_insights IS 'SERP analysis insights including competitor patterns, content gaps, and recommended topics';
COMMENT ON COLUMN article_outlines.serp_analysis_id IS 'Reference to the SERP analysis used for generating this outline';
COMMENT ON COLUMN article_outlines.brand_voice_applied IS 'Brand voice summary including tone, vocabulary level, and style';
COMMENT ON COLUMN article_outlines.brand_voice_sample_id IS 'Reference to the brand voice sample used';
COMMENT ON COLUMN article_outlines.seo_recommendations IS 'Array of SEO recommendations for the article';
COMMENT ON COLUMN article_outlines.estimated_word_count IS 'Total estimated word count for the complete article';
COMMENT ON COLUMN article_outlines.status IS 'Generation status: pending, generating, completed, or failed';
COMMENT ON COLUMN article_outlines.error_message IS 'Error message if generation failed';
COMMENT ON COLUMN article_outlines.metadata IS 'Generation metadata including model used, tokens, generation time';

-- Grant necessary permissions
GRANT ALL ON article_outlines TO authenticated;
GRANT ALL ON article_outlines TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_article_outlines TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_article_outlines TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_article_outline TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_article_outline TO authenticated;
GRANT EXECUTE ON FUNCTION update_article_outline_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_outline_stats TO authenticated;
