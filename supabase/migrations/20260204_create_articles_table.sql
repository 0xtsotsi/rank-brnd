-- Migration: Create Articles Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates articles table for content management with organization_id, product_id, title, slug, content, keyword_id, status, seo_score, published_at

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create article status enum type
DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    featured_image_url TEXT,
    status article_status DEFAULT 'draft'::article_status,
    seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    canonical_url TEXT,
    schema_type TEXT,
    schema_data JSONB DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ DEFAULT NULL,
    scheduled_at TIMESTAMPTZ DEFAULT NULL,
    author_id TEXT,
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_organization_id ON articles(organization_id);
CREATE INDEX IF NOT EXISTS idx_articles_product_id ON articles(product_id);
CREATE INDEX IF NOT EXISTS idx_articles_keyword_id ON articles(keyword_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_seo_score ON articles(seo_score);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON articles(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_deleted_at ON articles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_articles_org_product ON articles(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_articles_org_status ON articles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_articles_meta_keywords ON articles USING gin(meta_keywords);
CREATE INDEX IF NOT EXISTS idx_articles_metadata ON articles USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_articles_schema_data ON articles USING gin(schema_data);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to articles" ON articles;
DROP POLICY IF EXISTS "Articles are viewable by organization members" ON articles;
DROP POLICY IF EXISTS "Articles can be created by organization members" ON articles;
DROP POLICY IF EXISTS "Articles can be updated by organization admins" ON articles;
DROP POLICY IF EXISTS "Articles can be deleted by organization owners" ON articles;

-- RLS Policies for articles table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to articles"
ON articles
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view articles from their organizations (excluding deleted)
CREATE POLICY "Articles are viewable by organization members"
ON articles
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create articles
CREATE POLICY "Articles can be created by organization members"
ON articles
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update articles
CREATE POLICY "Articles can be updated by organization admins"
ON articles
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) articles
CREATE POLICY "Articles can be deleted by organization owners"
ON articles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = articles.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete an article
CREATE OR REPLACE FUNCTION soft_delete_article(p_article_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the article's organization_id
    SELECT organization_id INTO v_org_id
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL;

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

    -- Soft delete the article
    UPDATE articles
    SET deleted_at = NOW()
    WHERE id = p_article_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get articles for an organization
CREATE OR REPLACE FUNCTION get_organization_articles(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL,
    p_status article_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    status article_status,
    seo_score INTEGER,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            a.id,
            a.title,
            a.slug,
            a.status,
            a.seo_score,
            a.word_count,
            a.reading_time_minutes,
            a.published_at,
            a.scheduled_at,
            a.category,
            a.tags,
            a.created_at,
            a.updated_at
        FROM articles a
        WHERE a.organization_id = p_org_id
        AND (p_product_id IS NULL OR a.product_id = p_product_id)
        AND (p_status IS NULL OR a.status = p_status)
        ORDER BY a.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            a.id,
            a.title,
            a.slug,
            a.status,
            a.seo_score,
            a.word_count,
            a.reading_time_minutes,
            a.published_at,
            a.scheduled_at,
            a.category,
            a.tags,
            a.created_at,
            a.updated_at
        FROM articles a
        WHERE a.organization_id = p_org_id
        AND a.deleted_at IS NULL
        AND (p_product_id IS NULL OR a.product_id = p_product_id)
        AND (p_status IS NULL OR a.status = p_status)
        ORDER BY a.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get articles for a product
CREATE OR REPLACE FUNCTION get_product_articles(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status article_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    status article_status,
    seo_score INTEGER,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            a.id,
            a.title,
            a.slug,
            a.status,
            a.seo_score,
            a.word_count,
            a.reading_time_minutes,
            a.published_at,
            a.scheduled_at,
            a.category,
            a.tags,
            a.created_at,
            a.updated_at
        FROM articles a
        WHERE a.product_id = p_product_id
        AND (p_status IS NULL OR a.status = p_status)
        ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            a.id,
            a.title,
            a.slug,
            a.status,
            a.seo_score,
            a.word_count,
            a.reading_time_minutes,
            a.published_at,
            a.scheduled_at,
            a.category,
            a.tags,
            a.created_at,
            a.updated_at
        FROM articles a
        WHERE a.product_id = p_product_id
        AND a.deleted_at IS NULL
        AND (p_status IS NULL OR a.status = p_status)
        ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an article
CREATE OR REPLACE FUNCTION can_access_article(p_article_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM articles a
        JOIN organization_members om ON a.organization_id = om.organization_id
        WHERE a.id = p_article_id
        AND om.user_id = p_user_id
        AND a.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate reading time based on word count
CREATE OR REPLACE FUNCTION calculate_reading_time(p_word_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Average reading speed: 200 words per minute
    -- Minimum 1 minute for any content
    RETURN GREATEST(1, CEIL(p_word_count::NUMERIC / 200)::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to publish an article
CREATE OR REPLACE FUNCTION publish_article(p_article_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
    v_current_status article_status;
BEGIN
    -- Get the article's organization_id and current status
    SELECT organization_id, status INTO v_org_id, v_current_status
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_current_status = 'published' THEN
        RETURN TRUE; -- Already published
    END IF;

    -- Check if user is admin or owner
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin');

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Publish the article
    UPDATE articles
    SET status = 'published',
        published_at = NOW(),
        updated_at = NOW()
    WHERE id = p_article_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to unpublish an article (revert to draft)
CREATE OR REPLACE FUNCTION unpublish_article(p_article_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
    v_current_status article_status;
BEGIN
    -- Get the article's organization_id and current status
    SELECT organization_id, status INTO v_org_id, v_current_status
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_current_status != 'published' THEN
        RETURN TRUE; -- Already not published
    END IF;

    -- Check if user is admin or owner
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin');

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Unpublish the article
    UPDATE articles
    SET status = 'draft',
        updated_at = NOW()
    WHERE id = p_article_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE articles IS 'Content articles for SEO and content marketing with multi-tenancy support';
COMMENT ON COLUMN articles.id IS 'Unique identifier for the article';
COMMENT ON COLUMN articles.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN articles.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN articles.keyword_id IS 'Reference to the primary keyword this article targets';
COMMENT ON COLUMN articles.title IS 'Article title';
COMMENT ON COLUMN articles.slug IS 'URL-friendly slug for the article';
COMMENT ON COLUMN articles.content IS 'Article content (HTML, Markdown, or plain text)';
COMMENT ON COLUMN articles.excerpt IS 'Short summary or excerpt of the article';
COMMENT ON COLUMN articles.featured_image_url IS 'URL to the featured image';
COMMENT ON COLUMN articles.status IS 'Publication status: draft, published, archived';
COMMENT ON COLUMN articles.seo_score IS 'Calculated SEO score (0-100)';
COMMENT ON COLUMN articles.word_count IS 'Number of words in the content';
COMMENT ON COLUMN articles.reading_time_minutes IS 'Estimated reading time in minutes';
COMMENT ON COLUMN articles.meta_title IS 'SEO meta title';
COMMENT ON COLUMN articles.meta_description IS 'SEO meta description';
COMMENT ON COLUMN articles.meta_keywords IS 'SEO meta keywords';
COMMENT ON COLUMN articles.canonical_url IS 'Canonical URL for SEO';
COMMENT ON COLUMN articles.schema_type IS 'Structured data schema type (e.g., Article, BlogPosting)';
COMMENT ON COLUMN articles.schema_data IS 'Structured data for SEO as JSON';
COMMENT ON COLUMN articles.published_at IS 'Timestamp when article was published';
COMMENT ON COLUMN articles.scheduled_at IS 'Timestamp for scheduled publication';
COMMENT ON COLUMN articles.author_id IS 'ID of the author/user who created the article';
COMMENT ON COLUMN articles.tags IS 'Tags for categorization and filtering';
COMMENT ON COLUMN articles.category IS 'Article category';
COMMENT ON COLUMN articles.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN articles.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON articles TO authenticated;
GRANT ALL ON articles TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_article TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_articles TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_articles TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_article TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_reading_time TO authenticated;
GRANT EXECUTE ON FUNCTION publish_article TO authenticated;
GRANT EXECUTE ON FUNCTION unpublish_article TO authenticated;
