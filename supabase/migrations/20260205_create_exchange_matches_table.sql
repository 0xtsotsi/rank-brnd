-- Migration: Create Exchange Matches Table with Multi-Tenancy Support
-- Date: 2026-02-05
-- Description: Creates exchange_matches table for tracking exchange matches between organizations/products and exchange sites

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create exchange match status enum type
DO $$ BEGIN
    CREATE TYPE exchange_match_status AS ENUM ('pending', 'approved', 'published', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create exchange_matches table
CREATE TABLE IF NOT EXISTS exchange_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    exchange_site_id UUID NOT NULL REFERENCES exchange_network(id) ON DELETE CASCADE,
    status exchange_match_status DEFAULT 'pending'::exchange_match_status,
    credits_used INTEGER DEFAULT 0 CHECK (credits_used >= 0),
    target_url TEXT,
    anchor_text TEXT,
    content_title TEXT,
    content_id UUID,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, exchange_site_id, target_url)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_matches_organization_id ON exchange_matches(organization_id);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_product_id ON exchange_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_exchange_site_id ON exchange_matches(exchange_site_id);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_status ON exchange_matches(status);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_credits_used ON exchange_matches(credits_used);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_requested_at ON exchange_matches(requested_at);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_approved_at ON exchange_matches(approved_at);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_published_at ON exchange_matches(published_at);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_deleted_at ON exchange_matches(deleted_at);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_org_product ON exchange_matches(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_org_status ON exchange_matches(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_site_status ON exchange_matches(exchange_site_id, status);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_metadata ON exchange_matches USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_exchange_matches_created_at ON exchange_matches(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_exchange_matches_updated_at ON exchange_matches;
CREATE TRIGGER update_exchange_matches_updated_at
    BEFORE UPDATE ON exchange_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE exchange_matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to exchange_matches" ON exchange_matches;
DROP POLICY IF EXISTS "Exchange matches are viewable by organization members" ON exchange_matches;
DROP POLICY IF EXISTS "Exchange matches can be created by organization members" ON exchange_matches;
DROP POLICY IF EXISTS "Exchange matches can be updated by organization admins" ON exchange_matches;
DROP POLICY IF EXISTS "Exchange matches can be deleted by organization owners" ON exchange_matches;

-- RLS Policies for exchange_matches table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to exchange_matches"
ON exchange_matches
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view exchange matches from their organizations (excluding deleted)
CREATE POLICY "Exchange matches are viewable by organization members"
ON exchange_matches
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create exchange match requests
CREATE POLICY "Exchange matches can be created by organization members"
ON exchange_matches
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update exchange matches
CREATE POLICY "Exchange matches can be updated by organization admins"
ON exchange_matches
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) exchange matches
CREATE POLICY "Exchange matches can be deleted by organization owners"
ON exchange_matches
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_matches.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete an exchange match
CREATE OR REPLACE FUNCTION soft_delete_exchange_match(p_exchange_match_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the exchange match's organization_id
    SELECT organization_id INTO v_org_id
    FROM exchange_matches
    WHERE id = p_exchange_match_id AND deleted_at IS NULL;

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

    -- Soft delete the exchange match
    UPDATE exchange_matches
    SET deleted_at = NOW()
    WHERE id = p_exchange_match_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange matches for an organization
CREATE OR REPLACE FUNCTION get_organization_exchange_matches(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL,
    p_status exchange_match_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    exchange_site_id UUID,
    status exchange_match_status,
    credits_used INTEGER,
    target_url TEXT,
    anchor_text TEXT,
    content_title TEXT,
    requested_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            em.id,
            em.product_id,
            em.exchange_site_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.content_title,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.organization_id = p_org_id
        AND (p_product_id IS NULL OR em.product_id = p_product_id)
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            em.id,
            em.product_id,
            em.exchange_site_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.content_title,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.organization_id = p_org_id
        AND em.deleted_at IS NULL
        AND (p_product_id IS NULL OR em.product_id = p_product_id)
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange matches for a product
CREATE OR REPLACE FUNCTION get_product_exchange_matches(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status exchange_match_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    exchange_site_id UUID,
    status exchange_match_status,
    credits_used INTEGER,
    target_url TEXT,
    anchor_text TEXT,
    content_title TEXT,
    requested_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            em.id,
            em.exchange_site_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.content_title,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.product_id = p_product_id
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            em.id,
            em.exchange_site_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.content_title,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.product_id = p_product_id
        AND em.deleted_at IS NULL
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange matches for an exchange site
CREATE OR REPLACE FUNCTION get_exchange_site_matches(
    p_exchange_site_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status exchange_match_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    product_id UUID,
    status exchange_match_status,
    credits_used INTEGER,
    target_url TEXT,
    anchor_text TEXT,
    requested_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            em.id,
            em.organization_id,
            em.product_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.exchange_site_id = p_exchange_site_id
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            em.id,
            em.organization_id,
            em.product_id,
            em.status,
            em.credits_used,
            em.target_url,
            em.anchor_text,
            em.requested_at,
            em.approved_at,
            em.published_at,
            em.created_at
        FROM exchange_matches em
        WHERE em.exchange_site_id = p_exchange_site_id
        AND em.deleted_at IS NULL
        AND (p_status IS NULL OR em.status = p_status)
        ORDER BY em.requested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an exchange match
CREATE OR REPLACE FUNCTION can_access_exchange_match(p_exchange_match_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM exchange_matches em
        JOIN organization_members om ON em.organization_id = om.organization_id
        WHERE em.id = p_exchange_match_id
        AND om.user_id = p_user_id
        AND em.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update exchange match status
CREATE OR REPLACE FUNCTION update_exchange_match_status(
    p_exchange_match_id UUID,
    p_status exchange_match_status,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the exchange match's organization_id
    SELECT organization_id INTO v_org_id
    FROM exchange_matches
    WHERE id = p_exchange_match_id AND deleted_at IS NULL;

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

    -- Update the status and set appropriate timestamps
    UPDATE exchange_matches
    SET status = p_status,
        approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
        published_at = CASE WHEN p_status = 'published' THEN NOW() ELSE published_at END,
        completed_at = CASE WHEN p_status = 'published' THEN NOW() ELSE completed_at END
    WHERE id = p_exchange_match_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create a new exchange match request
CREATE OR REPLACE FUNCTION create_exchange_match_request(
    p_organization_id UUID,
    p_product_id UUID,
    p_exchange_site_id UUID,
    p_target_url TEXT,
    p_anchor_text TEXT DEFAULT NULL,
    p_content_title TEXT DEFAULT NULL,
    p_credits_used INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_new_match_id UUID;
BEGIN
    -- Create the exchange match request
    INSERT INTO exchange_matches (
        organization_id,
        product_id,
        exchange_site_id,
        target_url,
        anchor_text,
        content_title,
        credits_used,
        status
    )
    VALUES (
        p_organization_id,
        p_product_id,
        p_exchange_site_id,
        p_target_url,
        p_anchor_text,
        p_content_title,
        p_credits_used,
        'pending'::exchange_match_status
    )
    RETURNING id INTO v_new_match_id;

    RETURN v_new_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange match statistics
CREATE OR REPLACE FUNCTION get_exchange_match_stats(p_org_id UUID)
RETURNS TABLE (
    total_matches BIGINT,
    pending_matches BIGINT,
    approved_matches BIGINT,
    published_matches BIGINT,
    total_credits_used BIGINT,
    by_status exchange_match_status,
    match_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'published')::BIGINT,
        COALESCE(SUM(credits_used), 0)::BIGINT,
        status,
        COUNT(*)::BIGINT
    FROM exchange_matches
    WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    GROUP BY status
    ORDER BY match_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE exchange_matches IS 'Exchange matches tracking link building exchanges between organizations/products and exchange network sites';
COMMENT ON COLUMN exchange_matches.id IS 'Unique identifier for the exchange match';
COMMENT ON COLUMN exchange_matches.organization_id IS 'Reference to the requesting organization';
COMMENT ON COLUMN exchange_matches.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN exchange_matches.exchange_site_id IS 'Reference to the exchange network site';
COMMENT ON COLUMN exchange_matches.status IS 'Status of the exchange match: pending, approved, published, rejected, cancelled';
COMMENT ON COLUMN exchange_matches.credits_used IS 'Number of credits used for this exchange';
COMMENT ON COLUMN exchange_matches.target_url IS 'Target URL for the backlink';
COMMENT ON COLUMN exchange_matches.anchor_text IS 'Anchor text for the backlink';
COMMENT ON COLUMN exchange_matches.content_title IS 'Title of the content being linked to';
COMMENT ON COLUMN exchange_matches.content_id IS 'Reference to associated content/article (optional)';
COMMENT ON COLUMN exchange_matches.notes IS 'Additional notes about the exchange match';
COMMENT ON COLUMN exchange_matches.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN exchange_matches.requested_at IS 'Timestamp when the exchange was requested';
COMMENT ON COLUMN exchange_matches.approved_at IS 'Timestamp when the exchange was approved';
COMMENT ON COLUMN exchange_matches.published_at IS 'Timestamp when the link was published';
COMMENT ON COLUMN exchange_matches.completed_at IS 'Timestamp when the exchange was completed';
COMMENT ON COLUMN exchange_matches.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON exchange_matches TO authenticated;
GRANT ALL ON exchange_matches TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_exchange_match TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_exchange_matches TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_exchange_matches TO authenticated;
GRANT EXECUTE ON FUNCTION get_exchange_site_matches TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_exchange_match TO authenticated;
GRANT EXECUTE ON FUNCTION update_exchange_match_status TO authenticated;
GRANT EXECUTE ON FUNCTION create_exchange_match_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_exchange_match_stats TO authenticated;
