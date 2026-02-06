-- Migration: Create External Link Sources Table
-- Date: 2026-02-05
-- Description: Creates external_link_sources table for managing authoritative sources for external citations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create external link source category enum type
DO $$ BEGIN
    CREATE TYPE external_link_source_category AS ENUM (
        'academic',
        'government',
        'industry',
        'news',
        'reference',
        'statistics',
        'health',
        'technology',
        'business',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create external link source status enum type
DO $$ BEGIN
    CREATE TYPE external_link_source_status AS ENUM ('active', 'inactive', 'pending', 'deprecated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create external_link_sources table
CREATE TABLE IF NOT EXISTS external_link_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    category external_link_source_category DEFAULT 'other'::external_link_source_category,
    status external_link_source_status DEFAULT 'active'::external_link_source_status,
    domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
    page_authority INTEGER CHECK (page_authority >= 0 AND page_authority <= 100),
    spam_score NUMERIC(3,2) CHECK (spam_score >= 0 AND spam_score <= 1),
    trustworthiness_score INTEGER CHECK (trustworthiness_score >= 0 AND trustworthiness_score <= 100),
    is_global BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    topics TEXT[],
    language TEXT DEFAULT 'en',
    last_verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_link_sources_domain ON external_link_sources(domain);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_category ON external_link_sources(category);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_status ON external_link_sources(status);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_organization_id ON external_link_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_domain_authority ON external_link_sources(domain_authority);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_is_global ON external_link_sources(is_global);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_topics ON external_link_sources USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_deleted_at ON external_link_sources(deleted_at);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_metadata ON external_link_sources USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_external_link_sources_created_at ON external_link_sources(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_external_link_sources_updated_at ON external_link_sources;
CREATE TRIGGER update_external_link_sources_updated_at
    BEFORE UPDATE ON external_link_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE external_link_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to external_link_sources" ON external_link_sources;
DROP POLICY IF EXISTS "Global external link sources are viewable by all authenticated users" ON external_link_sources;
DROP POLICY IF EXISTS "Organization external link sources are viewable by organization members" ON external_link_sources;
DROP POLICY IF EXISTS "External link sources can be created by organization admins" ON external_link_sources;
DROP POLICY IF EXISTS "External link sources can be updated by organization admins" ON external_link_sources;
DROP POLICY IF EXISTS "External link sources can be deleted by organization owners" ON external_link_sources;

-- RLS Policies for external_link_sources table

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to external_link_sources"
ON external_link_sources
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: All authenticated users can view global sources
CREATE POLICY "Global external link sources are viewable by all authenticated users"
ON external_link_sources
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND is_global = true
    AND status = 'active'::external_link_source_status
);

-- Policy: Organization members can view their organization's sources
CREATE POLICY "Organization external link sources are viewable by organization members"
ON external_link_sources
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND organization_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization admins can create external link sources
CREATE POLICY "External link sources can be created by organization admins"
ON external_link_sources
FOR INSERT
TO authenticated
WITH CHECK (
    is_global = false
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Organization admins can update external link sources
CREATE POLICY "External link sources can be updated by organization admins"
ON external_link_sources
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete external link sources
CREATE POLICY "External link sources can be deleted by organization owners"
ON external_link_sources
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_sources.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get all available external link sources
CREATE OR REPLACE FUNCTION get_available_external_link_sources(
    p_organization_id UUID DEFAULT NULL,
    p_category external_link_source_category DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_min_authority INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    domain TEXT,
    name TEXT,
    url TEXT,
    description TEXT,
    category external_link_source_category,
    domain_authority INTEGER,
    trustworthiness_score INTEGER,
    topics TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        els.id,
        els.domain,
        els.name,
        els.url,
        els.description,
        els.category,
        els.domain_authority,
        els.trustworthiness_score,
        els.topics
    FROM external_link_sources els
    WHERE els.deleted_at IS NULL
    AND els.status = 'active'::external_link_source_status
    AND (els.is_global = true OR els.organization_id = p_organization_id OR p_organization_id IS NULL)
    AND (p_category IS NULL OR els.category = p_category)
    AND (p_topics IS NULL OR els.topics && p_topics)
    AND (p_min_authority IS NULL OR els.domain_authority >= p_min_authority)
    ORDER BY els.trustworthiness_score DESC, els.domain_authority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to find relevant external sources for content
CREATE OR REPLACE FUNCTION find_relevant_external_sources(
    p_content_keywords TEXT[],
    p_category external_link_source_category DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    domain TEXT,
    name TEXT,
    url TEXT,
    description TEXT,
    category external_link_source_category,
    domain_authority INTEGER,
    trustworthiness_score INTEGER,
    relevance_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        els.id,
        els.domain,
        els.name,
        els.url,
        els.description,
        els.category,
        els.domain_authority,
        els.trustworthiness_score,
        -- Calculate relevance score based on keyword matches in topics/description
        (
            COALESCE(array_length(ARRAY(
                SELECT keyword FROM unnest(p_content_keywords) keyword
                WHERE keyword ILIKE ANY(els.topics)
                OR keyword ILIKE '%' || els.description || '%'
                OR keyword ILIKE '%' || els.name || '%'
            ), 1), 0) * 10.0
        )::NUMERIC as relevance_score
    FROM external_link_sources els
    WHERE els.deleted_at IS NULL
    AND els.status = 'active'::external_link_source_status
    AND (els.is_global = true OR els.organization_id = p_organization_id OR p_organization_id IS NULL)
    AND (p_category IS NULL OR els.category = p_category)
    ORDER BY relevance_score DESC, els.trustworthiness_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to soft delete an external link source
CREATE OR REPLACE FUNCTION soft_delete_external_link_source(p_source_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the source's organization_id
    SELECT organization_id INTO v_org_id
    FROM external_link_sources
    WHERE id = p_source_id AND deleted_at IS NULL;

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

    -- Soft delete the source
    UPDATE external_link_sources
    SET deleted_at = NOW()
    WHERE id = p_source_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE external_link_sources IS 'Authoritative external sources for citations and external linking';
COMMENT ON COLUMN external_link_sources.id IS 'Unique identifier for the external link source';
COMMENT ON COLUMN external_link_sources.domain IS 'Domain name of the source (e.g., wikipedia.org)';
COMMENT ON COLUMN external_link_sources.name IS 'Display name of the source';
COMMENT ON COLUMN external_link_sources.url IS 'Base URL of the source';
COMMENT ON COLUMN external_link_sources.description IS 'Description of the source and what it covers';
COMMENT ON COLUMN external_link_sources.category IS 'Category of the source: academic, government, industry, news, reference, statistics, health, technology, business, other';
COMMENT ON COLUMN external_link_sources.status IS 'Status of the source: active, inactive, pending, deprecated';
COMMENT ON COLUMN external_link_sources.domain_authority IS 'Domain authority score (0-100) from Moz/Ahrefs';
COMMENT ON COLUMN external_link_sources.trustworthiness_score IS 'Trustworthiness score (0-100) for the source';
COMMENT ON COLUMN external_link_sources.is_global IS 'Whether this source is available globally or only to specific organization';
COMMENT ON COLUMN external_link_sources.organization_id IS 'Organization ID if this is a custom source (null for global sources)';
COMMENT ON COLUMN external_link_sources.topics IS 'Array of topics/keywords this source covers';
COMMENT ON COLUMN external_link_sources.language IS 'Primary language of the source (ISO 639-1 code)';
COMMENT ON COLUMN external_link_sources.last_verified_at IS 'Last time the source was verified as accessible';

-- Grant necessary permissions
GRANT ALL ON external_link_sources TO authenticated;
GRANT ALL ON external_link_sources TO service_role;
GRANT EXECUTE ON FUNCTION get_available_external_link_sources TO authenticated;
GRANT EXECUTE ON FUNCTION find_relevant_external_sources TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_external_link_source TO authenticated;
