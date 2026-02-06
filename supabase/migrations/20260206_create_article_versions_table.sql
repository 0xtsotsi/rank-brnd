-- Migration: Create Article Versions Table
-- Date: 2026-02-06
-- Description: Creates article_versions table for version history and comparison

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create article versions table
CREATE TABLE IF NOT EXISTS article_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    canonical_url TEXT,
    schema_type TEXT,
    schema_data JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT,
    change_notes TEXT,
    is_auto_save BOOLEAN DEFAULT false,
    UNIQUE(article_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_versions_article_id ON article_versions(article_id);
CREATE INDEX IF NOT EXISTS idx_article_versions_changed_at ON article_versions(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_versions_changed_by ON article_versions(changed_by);
CREATE INDEX IF NOT EXISTS idx_article_versions_article_version ON article_versions(article_id, version_number);
CREATE INDEX IF NOT EXISTS idx_article_versions_status ON article_versions(status);

-- Enable Row Level Security
ALTER TABLE article_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to article_versions" ON article_versions;
DROP POLICY IF EXISTS "Article versions are viewable by organization members" ON article_versions;

-- RLS Policies for article_versions table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to article_versions"
ON article_versions
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view versions of articles from their organizations
CREATE POLICY "Article versions are viewable by organization members"
ON article_versions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM articles
        WHERE articles.id = article_versions.article_id
        AND articles.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = articles.organization_id
            AND organization_members.user_id = auth.uid()::text
        )
    )
);

-- Helper function to get the next version number for an article
CREATE OR REPLACE FUNCTION get_next_article_version_number(p_article_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM article_versions
    WHERE article_id = p_article_id;

    RETURN v_next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create a new article version
CREATE OR REPLACE FUNCTION create_article_version(
    p_article_id UUID,
    p_changed_by TEXT DEFAULT NULL,
    p_change_notes TEXT DEFAULT NULL,
    p_is_auto_save BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_new_version_id UUID;
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the article's organization_id for permission check
    SELECT organization_id INTO v_org_id
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check if user is a member of the organization (for auto-save and manual saves)
    IF p_changed_by IS NOT NULL THEN
        SELECT role INTO v_user_role
        FROM organization_members
        WHERE organization_id = v_org_id
        AND user_id = p_changed_by
        AND role IN ('owner', 'admin', 'member');

        IF v_user_role IS NULL AND p_is_auto_save = false THEN
            -- Only allow manual saves by organization members
            RETURN NULL;
        END IF;
    END IF;

    -- Get the next version number
    v_version_number := get_next_article_version_number(p_article_id);

    -- Insert the new version
    INSERT INTO article_versions (
        article_id,
        version_number,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        status,
        seo_score,
        word_count,
        reading_time_minutes,
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        schema_type,
        schema_data,
        tags,
        category,
        metadata,
        changed_by,
        change_notes,
        is_auto_save
    )
    SELECT
        p_article_id,
        v_version_number,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        status,
        seo_score,
        word_count,
        reading_time_minutes,
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        schema_type,
        schema_data,
        tags,
        category,
        metadata,
        p_changed_by,
        p_change_notes,
        p_is_auto_save
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL
    RETURNING id INTO v_new_version_id;

    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to revert an article to a previous version
CREATE OR REPLACE FUNCTION revert_article_to_version(
    p_article_id UUID,
    p_version_number INTEGER,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
    v_version_exists BOOLEAN;
BEGIN
    -- Get the article's organization_id
    SELECT organization_id INTO v_org_id
    FROM articles
    WHERE id = p_article_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
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

    -- Check if the version exists
    SELECT EXISTS (
        SELECT 1 FROM article_versions
        WHERE article_id = p_article_id
        AND version_number = p_version_number
    ) INTO v_version_exists;

    IF NOT v_version_exists THEN
        RETURN FALSE;
    END IF;

    -- Update the article with the version data
    UPDATE articles
    SET
        title = av.title,
        slug = av.slug,
        content = av.content,
        excerpt = av.excerpt,
        featured_image_url = av.featured_image_url,
        status = av.status,
        seo_score = av.seo_score,
        word_count = av.word_count,
        reading_time_minutes = av.reading_time_minutes,
        meta_title = av.meta_title,
        meta_description = av.meta_description,
        meta_keywords = av.meta_keywords,
        canonical_url = av.canonical_url,
        schema_type = av.schema_type,
        schema_data = av.schema_data,
        tags = av.tags,
        category = av.category,
        metadata = av.metadata,
        updated_at = NOW()
    FROM article_versions av
    WHERE articles.id = p_article_id
    AND av.article_id = p_article_id
    AND av.version_number = p_version_number;

    -- Create a new version to record the revert action
    PERFORM create_article_version(
        p_article_id,
        p_user_id,
        'Reverted to version ' || p_version_number,
        false
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get article versions
CREATE OR REPLACE FUNCTION get_article_versions(
    p_article_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    title TEXT,
    status TEXT,
    word_count INTEGER,
    changed_at TIMESTAMPTZ,
    changed_by TEXT,
    change_notes TEXT,
    is_auto_save BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        av.id,
        av.version_number,
        av.title,
        av.status,
        av.word_count,
        av.changed_at,
        av.changed_by,
        av.change_notes,
        av.is_auto_save
    FROM article_versions av
    WHERE av.article_id = p_article_id
    ORDER BY av.version_number DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get a specific article version
CREATE OR REPLACE FUNCTION get_article_version_detail(
    p_version_id UUID
)
RETURNS TABLE (
    id UUID,
    article_id UUID,
    version_number INTEGER,
    title TEXT,
    slug TEXT,
    content TEXT,
    excerpt TEXT,
    featured_image_url TEXT,
    status TEXT,
    seo_score INTEGER,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    canonical_url TEXT,
    schema_type TEXT,
    schema_data JSONB,
    tags TEXT[],
    category TEXT,
    metadata JSONB,
    changed_at TIMESTAMPTZ,
    changed_by TEXT,
    change_notes TEXT,
    is_auto_save BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        av.id,
        av.article_id,
        av.version_number,
        av.title,
        av.slug,
        av.content,
        av.excerpt,
        av.featured_image_url,
        av.status,
        av.seo_score,
        av.word_count,
        av.reading_time_minutes,
        av.meta_title,
        av.meta_description,
        av.meta_keywords,
        av.canonical_url,
        av.schema_type,
        av.schema_data,
        av.tags,
        av.category,
        av.metadata,
        av.changed_at,
        av.changed_by,
        av.change_notes,
        av.is_auto_save
    FROM article_versions av
    WHERE av.id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to compare two article versions
CREATE OR REPLACE FUNCTION compare_article_versions(
    p_article_id UUID,
    p_version_number1 INTEGER,
    p_version_number2 INTEGER
)
RETURNS TABLE (
    field TEXT,
    value1 TEXT,
    value2 TEXT,
    is_different BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH v1 AS (
        SELECT * FROM article_versions
        WHERE article_id = p_article_id AND version_number = p_version_number1
    ),
    v2 AS (
        SELECT * FROM article_versions
        WHERE article_id = p_article_id AND version_number = p_version_number2
    )
    SELECT
        'title'::TEXT AS field,
        v1.title AS value1,
        v2.title AS value2,
        v1.title IS DISTINCT FROM v2.title AS is_different
    FROM v1, v2
    UNION ALL
    SELECT
        'content',
        LEFT(v1.content, 500),
        LEFT(v2.content, 500),
        v1.content IS DISTINCT FROM v2.content
    FROM v1, v2
    UNION ALL
    SELECT
        'excerpt',
        v1.excerpt,
        v2.excerpt,
        v1.excerpt IS DISTINCT FROM v2.excerpt
    FROM v1, v2
    UNION ALL
    SELECT
        'status',
        v1.status,
        v2.status,
        v1.status IS DISTINCT FROM v2.status
    FROM v1, v2
    UNION ALL
    SELECT
        'seo_score',
        v1.seo_score::TEXT,
        v2.seo_score::TEXT,
        v1.seo_score IS DISTINCT FROM v2.seo_score
    FROM v1, v2
    UNION ALL
    SELECT
        'word_count',
        v1.word_count::TEXT,
        v2.word_count::TEXT,
        v1.word_count IS DISTINCT FROM v2.word_count
    FROM v1, v2
    UNION ALL
    SELECT
        'meta_title',
        v1.meta_title,
        v2.meta_title,
        v1.meta_title IS DISTINCT FROM v2.meta_title
    FROM v1, v2
    UNION ALL
    SELECT
        'meta_description',
        v1.meta_description,
        v2.meta_description,
        v1.meta_description IS DISTINCT FROM v2.meta_description
    FROM v1, v2
    UNION ALL
    SELECT
        'tags',
        array_to_string(v1.tags, ', '),
        array_to_string(v2.tags, ', '),
        v1.tags IS DISTINCT FROM v2.tags
    FROM v1, v2
    UNION ALL
    SELECT
        'category',
        v1.category,
        v2.category,
        v1.category IS DISTINCT FROM v2.category
    FROM v1, v2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old auto-save versions (keep only manual saves and last N auto-saves)
CREATE OR REPLACE FUNCTION cleanup_old_auto_save_versions(
    p_article_id UUID,
    p_keep_auto_saves INTEGER DEFAULT 5
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete old auto-save versions, keeping only the most recent N
    WITH versions_to_delete AS (
        SELECT id
        FROM article_versions
        WHERE article_id = p_article_id
        AND is_auto_save = true
        AND id NOT IN (
            SELECT id
            FROM article_versions
            WHERE article_id = p_article_id
            AND is_auto_save = true
            ORDER BY changed_at DESC
            LIMIT p_keep_auto_saves
        )
    )
    DELETE FROM article_versions
    WHERE id IN (SELECT id FROM versions_to_delete)
    RETURNING COUNT(*) INTO v_deleted_count;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE article_versions IS 'Version history for articles with comparison and revert capabilities';
COMMENT ON COLUMN article_versions.id IS 'Unique identifier for the version';
COMMENT ON COLUMN article_versions.article_id IS 'Reference to the article';
COMMENT ON COLUMN article_versions.version_number IS 'Sequential version number for the article';
COMMENT ON COLUMN article_versions.title IS 'Article title at this version';
COMMENT ON COLUMN article_versions.slug IS 'URL-friendly slug at this version';
COMMENT ON COLUMN article_versions.content IS 'Article content at this version';
COMMENT ON COLUMN article_versions.changed_at IS 'Timestamp when this version was created';
COMMENT ON COLUMN article_versions.changed_by IS 'User ID who made the change';
COMMENT ON COLUMN article_versions.change_notes IS 'Optional notes about the change';
COMMENT ON COLUMN article_versions.is_auto_save IS 'Whether this version was created by auto-save';

-- Grant necessary permissions
GRANT ALL ON article_versions TO authenticated;
GRANT ALL ON article_versions TO service_role;
GRANT EXECUTE ON FUNCTION get_next_article_version_number TO authenticated;
GRANT EXECUTE ON FUNCTION create_article_version TO authenticated;
GRANT EXECUTE ON FUNCTION revert_article_to_version TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_versions TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_version_detail TO authenticated;
GRANT EXECUTE ON FUNCTION compare_article_versions TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_auto_save_versions TO authenticated;
