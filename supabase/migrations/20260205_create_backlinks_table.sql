-- Migration: Create Backlinks Table with Multi-Tenancy Support
-- Date: 2026-02-05
-- Description: Creates backlinks table for tracking inbound links with organization_id, product_id, article_id, source_url, target_url, domain_authority, status, created_at

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create backlink status enum type
DO $$ BEGIN
    CREATE TYPE backlink_status AS ENUM ('pending', 'active', 'lost', 'disavowed', 'spam');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create link type enum type
DO $$ BEGIN
    CREATE TYPE link_type AS ENUM ('dofollow', 'nofollow', 'sponsored', 'ugc');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create backlinks table
CREATE TABLE IF NOT EXISTS backlinks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    domain_authority INTEGER CHECK (domain_authority >= 0 AND domain_authority <= 100),
    page_authority INTEGER CHECK (page_authority >= 0 AND page_authority <= 100),
    spam_score NUMERIC(3, 2) CHECK (spam_score >= 0 AND spam_score <= 1),
    link_type link_type,
    anchor_text TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ,
    lost_at TIMESTAMPTZ,
    status backlink_status DEFAULT 'pending'::backlink_status,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backlinks_organization_id ON backlinks(organization_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_product_id ON backlinks(product_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_article_id ON backlinks(article_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_source_url ON backlinks(source_url);
CREATE INDEX IF NOT EXISTS idx_backlinks_target_url ON backlinks(target_url);
CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status);
CREATE INDEX IF NOT EXISTS idx_backlinks_link_type ON backlinks(link_type);
CREATE INDEX IF NOT EXISTS idx_backlinks_domain_authority ON backlinks(domain_authority);
CREATE INDEX IF NOT EXISTS idx_backlinks_deleted_at ON backlinks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_backlinks_org_product ON backlinks(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_org_article ON backlinks(organization_id, article_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_tags ON backlinks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_backlinks_metadata ON backlinks USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_backlinks_created_at ON backlinks(created_at);
CREATE INDEX IF NOT EXISTS idx_backlinks_first_seen_at ON backlinks(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_backlinks_last_verified_at ON backlinks(last_verified_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_backlinks_updated_at ON backlinks;
CREATE TRIGGER update_backlinks_updated_at
    BEFORE UPDATE ON backlinks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE backlinks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to backlinks" ON backlinks;
DROP POLICY IF EXISTS "Backlinks are viewable by organization members" ON backlinks;
DROP POLICY IF EXISTS "Backlinks can be created by organization members" ON backlinks;
DROP POLICY IF EXISTS "Backlinks can be updated by organization admins" ON backlinks;
DROP POLICY IF EXISTS "Backlinks can be deleted by organization owners" ON backlinks;

-- RLS Policies for backlinks table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to backlinks"
ON backlinks
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view backlinks from their organizations (excluding deleted)
CREATE POLICY "Backlinks are viewable by organization members"
ON backlinks
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create backlinks
CREATE POLICY "Backlinks can be created by organization members"
ON backlinks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update backlinks
CREATE POLICY "Backlinks can be updated by organization admins"
ON backlinks
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) backlinks
CREATE POLICY "Backlinks can be deleted by organization owners"
ON backlinks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = backlinks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete a backlink
CREATE OR REPLACE FUNCTION soft_delete_backlink(p_backlink_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the backlink's organization_id
    SELECT organization_id INTO v_org_id
    FROM backlinks
    WHERE id = p_backlink_id AND deleted_at IS NULL;

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

    -- Soft delete the backlink
    UPDATE backlinks
    SET deleted_at = NOW()
    WHERE id = p_backlink_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get backlinks for an organization
CREATE OR REPLACE FUNCTION get_organization_backlinks(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL,
    p_article_id UUID DEFAULT NULL,
    p_status backlink_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_url TEXT,
    target_url TEXT,
    domain_authority INTEGER,
    page_authority INTEGER,
    status backlink_status,
    link_type link_type,
    anchor_text TEXT,
    first_seen_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.organization_id = p_org_id
        AND (p_product_id IS NULL OR b.product_id = p_product_id)
        AND (p_article_id IS NULL OR b.article_id = p_article_id)
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.organization_id = p_org_id
        AND b.deleted_at IS NULL
        AND (p_product_id IS NULL OR b.product_id = p_product_id)
        AND (p_article_id IS NULL OR b.article_id = p_article_id)
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get backlinks for a product
CREATE OR REPLACE FUNCTION get_product_backlinks(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status backlink_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_url TEXT,
    target_url TEXT,
    domain_authority INTEGER,
    page_authority INTEGER,
    status backlink_status,
    link_type link_type,
    anchor_text TEXT,
    first_seen_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.product_id = p_product_id
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.domain_authority DESC NULLS LAST, b.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.product_id = p_product_id
        AND b.deleted_at IS NULL
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.domain_authority DESC NULLS LAST, b.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get backlinks for an article
CREATE OR REPLACE FUNCTION get_article_backlinks(
    p_article_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status backlink_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_url TEXT,
    target_url TEXT,
    domain_authority INTEGER,
    page_authority INTEGER,
    status backlink_status,
    link_type link_type,
    anchor_text TEXT,
    first_seen_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.article_id = p_article_id
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.domain_authority DESC NULLS LAST, b.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            b.id,
            b.source_url,
            b.target_url,
            b.domain_authority,
            b.page_authority,
            b.status,
            b.link_type,
            b.anchor_text,
            b.first_seen_at,
            b.last_verified_at,
            b.created_at
        FROM backlinks b
        WHERE b.article_id = p_article_id
        AND b.deleted_at IS NULL
        AND (p_status IS NULL OR b.status = p_status)
        ORDER BY b.domain_authority DESC NULLS LAST, b.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a backlink
CREATE OR REPLACE FUNCTION can_access_backlink(p_backlink_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM backlinks b
        JOIN organization_members om ON b.organization_id = om.organization_id
        WHERE b.id = p_backlink_id
        AND om.user_id = p_user_id
        AND b.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update backlink status
CREATE OR REPLACE FUNCTION update_backlink_status(
    p_backlink_id UUID,
    p_status backlink_status,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the backlink's organization_id
    SELECT organization_id INTO v_org_id
    FROM backlinks
    WHERE id = p_backlink_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is admin or owner
    IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_org_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    ) THEN
        RETURN FALSE;
    END IF;

    -- Update the status
    UPDATE backlinks
    SET status = p_status,
        last_verified_at = NOW(),
        lost_at = CASE WHEN p_status = 'lost' THEN NOW() ELSE lost_at END
    WHERE id = p_backlink_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE backlinks IS 'Inbound links tracked by organizations for their products and articles';
COMMENT ON COLUMN backlinks.id IS 'Unique identifier for the backlink';
COMMENT ON COLUMN backlinks.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN backlinks.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN backlinks.article_id IS 'Reference to the associated article (optional)';
COMMENT ON COLUMN backlinks.source_url IS 'URL of the page containing the link';
COMMENT ON COLUMN backlinks.target_url IS 'URL of the page being linked to';
COMMENT ON COLUMN backlinks.domain_authority IS 'Domain authority score (0-100) from Moz or similar';
COMMENT ON COLUMN backlinks.page_authority IS 'Page authority score (0-100) from Moz or similar';
COMMENT ON COLUMN backlinks.spam_score IS 'Spam score (0-1) indicating likelihood of spam';
COMMENT ON COLUMN backlinks.link_type IS 'Type of link: dofollow, nofollow, sponsored, ugc';
COMMENT ON COLUMN backlinks.anchor_text IS 'Anchor text used in the link';
COMMENT ON COLUMN backlinks.first_seen_at IS 'Timestamp when the backlink was first discovered';
COMMENT ON COLUMN backlinks.last_verified_at IS 'Timestamp when the backlink was last verified as active';
COMMENT ON COLUMN backlinks.lost_at IS 'Timestamp when the backlink was lost (if status is lost)';
COMMENT ON COLUMN backlinks.status IS 'Status of the backlink: pending, active, lost, disavowed, spam';
COMMENT ON COLUMN backlinks.notes IS 'Additional notes about the backlink';
COMMENT ON COLUMN backlinks.tags IS 'Tags for categorization and filtering';
COMMENT ON COLUMN backlinks.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN backlinks.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON backlinks TO authenticated;
GRANT ALL ON backlinks TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_backlink TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_backlinks TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_backlinks TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_backlinks TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_backlink TO authenticated;
GRANT EXECUTE ON FUNCTION update_backlink_status TO authenticated;
