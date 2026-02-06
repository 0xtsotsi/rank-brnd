-- Migration: Create Exchange Network Table with Multi-Tenancy Support
-- Date: 2026-02-05
-- Description: Creates exchange_network table for tracking partner sites with organization_id, site_id, domain, authority, niche, credits_available, quality_score, spam_score, created_at

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create exchange network status enum type
DO $$ BEGIN
    CREATE TYPE exchange_network_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create exchange_network table
CREATE TABLE IF NOT EXISTS exchange_network (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    site_id TEXT,
    domain TEXT NOT NULL,
    authority INTEGER CHECK (authority >= 0 AND authority <= 100),
    niche TEXT,
    credits_available INTEGER DEFAULT 0 CHECK (credits_available >= 0),
    quality_score NUMERIC(3, 2) CHECK (quality_score >= 0 AND quality_score <= 1),
    spam_score NUMERIC(3, 2) CHECK (spam_score >= 0 AND spam_score <= 1),
    status exchange_network_status DEFAULT 'active'::exchange_network_status,
    contact_email TEXT,
    contact_name TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, domain)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_network_organization_id ON exchange_network(organization_id);
CREATE INDEX IF NOT EXISTS idx_exchange_network_product_id ON exchange_network(product_id);
CREATE INDEX IF NOT EXISTS idx_exchange_network_site_id ON exchange_network(site_id);
CREATE INDEX IF NOT EXISTS idx_exchange_network_domain ON exchange_network(domain);
CREATE INDEX IF NOT EXISTS idx_exchange_network_status ON exchange_network(status);
CREATE INDEX IF NOT EXISTS idx_exchange_network_authority ON exchange_network(authority);
CREATE INDEX IF NOT EXISTS idx_exchange_network_niche ON exchange_network(niche);
CREATE INDEX IF NOT EXISTS idx_exchange_network_credits_available ON exchange_network(credits_available);
CREATE INDEX IF NOT EXISTS idx_exchange_network_quality_score ON exchange_network(quality_score);
CREATE INDEX IF NOT EXISTS idx_exchange_network_spam_score ON exchange_network(spam_score);
CREATE INDEX IF NOT EXISTS idx_exchange_network_deleted_at ON exchange_network(deleted_at);
CREATE INDEX IF NOT EXISTS idx_exchange_network_org_product ON exchange_network(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_exchange_network_tags ON exchange_network USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_exchange_network_metadata ON exchange_network USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_exchange_network_created_at ON exchange_network(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_exchange_network_updated_at ON exchange_network;
CREATE TRIGGER update_exchange_network_updated_at
    BEFORE UPDATE ON exchange_network
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE exchange_network ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to exchange_network" ON exchange_network;
DROP POLICY IF EXISTS "Exchange network sites are viewable by organization members" ON exchange_network;
DROP POLICY IF EXISTS "Exchange network sites can be created by organization members" ON exchange_network;
DROP POLICY IF EXISTS "Exchange network sites can be updated by organization admins" ON exchange_network;
DROP POLICY IF EXISTS "Exchange network sites can be deleted by organization owners" ON exchange_network;

-- RLS Policies for exchange_network table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to exchange_network"
ON exchange_network
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view exchange network sites from their organizations (excluding deleted)
CREATE POLICY "Exchange network sites are viewable by organization members"
ON exchange_network
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create exchange network sites
CREATE POLICY "Exchange network sites can be created by organization members"
ON exchange_network
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update exchange network sites
CREATE POLICY "Exchange network sites can be updated by organization admins"
ON exchange_network
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) exchange network sites
CREATE POLICY "Exchange network sites can be deleted by organization owners"
ON exchange_network
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = exchange_network.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete an exchange network site
CREATE OR REPLACE FUNCTION soft_delete_exchange_network(p_exchange_network_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the exchange network site's organization_id
    SELECT organization_id INTO v_org_id
    FROM exchange_network
    WHERE id = p_exchange_network_id AND deleted_at IS NULL;

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

    -- Soft delete the exchange network site
    UPDATE exchange_network
    SET deleted_at = NOW()
    WHERE id = p_exchange_network_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange network sites for an organization
CREATE OR REPLACE FUNCTION get_organization_exchange_network(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL,
    p_status exchange_network_status DEFAULT NULL,
    p_niche TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    site_id TEXT,
    domain TEXT,
    authority INTEGER,
    niche TEXT,
    credits_available INTEGER,
    quality_score NUMERIC(3, 2),
    spam_score NUMERIC(3, 2),
    status exchange_network_status,
    contact_email TEXT,
    contact_name TEXT,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            en.id,
            en.site_id,
            en.domain,
            en.authority,
            en.niche,
            en.credits_available,
            en.quality_score,
            en.spam_score,
            en.status,
            en.contact_email,
            en.contact_name,
            en.last_verified_at,
            en.created_at
        FROM exchange_network en
        WHERE en.organization_id = p_org_id
        AND (p_product_id IS NULL OR en.product_id = p_product_id)
        AND (p_status IS NULL OR en.status = p_status)
        AND (p_niche IS NULL OR en.niche = p_niche)
        ORDER BY en.authority DESC NULLS LAST, en.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            en.id,
            en.site_id,
            en.domain,
            en.authority,
            en.niche,
            en.credits_available,
            en.quality_score,
            en.spam_score,
            en.status,
            en.contact_email,
            en.contact_name,
            en.last_verified_at,
            en.created_at
        FROM exchange_network en
        WHERE en.organization_id = p_org_id
        AND en.deleted_at IS NULL
        AND (p_product_id IS NULL OR en.product_id = p_product_id)
        AND (p_status IS NULL OR en.status = p_status)
        AND (p_niche IS NULL OR en.niche = p_niche)
        ORDER BY en.authority DESC NULLS LAST, en.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange network sites for a product
CREATE OR REPLACE FUNCTION get_product_exchange_network(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status exchange_network_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    site_id TEXT,
    domain TEXT,
    authority INTEGER,
    niche TEXT,
    credits_available INTEGER,
    quality_score NUMERIC(3, 2),
    spam_score NUMERIC(3, 2),
    status exchange_network_status,
    contact_email TEXT,
    contact_name TEXT,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            en.id,
            en.site_id,
            en.domain,
            en.authority,
            en.niche,
            en.credits_available,
            en.quality_score,
            en.spam_score,
            en.status,
            en.contact_email,
            en.contact_name,
            en.last_verified_at,
            en.created_at
        FROM exchange_network en
        WHERE en.product_id = p_product_id
        AND (p_status IS NULL OR en.status = p_status)
        ORDER BY en.authority DESC NULLS LAST, en.quality_score DESC NULLS LAST;
    ELSE
        RETURN QUERY
        SELECT
            en.id,
            en.site_id,
            en.domain,
            en.authority,
            en.niche,
            en.credits_available,
            en.quality_score,
            en.spam_score,
            en.status,
            en.contact_email,
            en.contact_name,
            en.last_verified_at,
            en.created_at
        FROM exchange_network en
        WHERE en.product_id = p_product_id
        AND en.deleted_at IS NULL
        AND (p_status IS NULL OR en.status = p_status)
        ORDER BY en.authority DESC NULLS LAST, en.quality_score DESC NULLS LAST;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an exchange network site
CREATE OR REPLACE FUNCTION can_access_exchange_network(p_exchange_network_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM exchange_network en
        JOIN organization_members om ON en.organization_id = om.organization_id
        WHERE en.id = p_exchange_network_id
        AND om.user_id = p_user_id
        AND en.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update exchange network status
CREATE OR REPLACE FUNCTION update_exchange_network_status(
    p_exchange_network_id UUID,
    p_status exchange_network_status,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the exchange network site's organization_id
    SELECT organization_id INTO v_org_id
    FROM exchange_network
    WHERE id = p_exchange_network_id AND deleted_at IS NULL;

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
    UPDATE exchange_network
    SET status = p_status,
        last_verified_at = NOW()
    WHERE id = p_exchange_network_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update credits available
CREATE OR REPLACE FUNCTION update_exchange_network_credits(
    p_exchange_network_id UUID,
    p_credits_change INTEGER,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_current_credits INTEGER;
BEGIN
    -- Get the exchange network site's organization_id and current credits
    SELECT organization_id, credits_available INTO v_org_id, v_current_credits
    FROM exchange_network
    WHERE id = p_exchange_network_id AND deleted_at IS NULL;

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

    -- Calculate new credits (ensure they don't go below 0)
    v_current_credits := v_current_credits + p_credits_change;
    IF v_current_credits < 0 THEN
        v_current_credits := 0;
    END IF;

    -- Update the credits
    UPDATE exchange_network
    SET credits_available = v_current_credits
    WHERE id = p_exchange_network_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get exchange network statistics
CREATE OR REPLACE FUNCTION get_exchange_network_stats(p_org_id UUID)
RETURNS TABLE (
    total_sites BIGINT,
    active_sites BIGINT,
    total_credits BIGINT,
    avg_authority NUMERIC,
    avg_quality_score NUMERIC,
    by_niche TEXT,
    site_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
        COALESCE(SUM(credits_available), 0)::BIGINT,
        COALESCE(AVG(authority), 0),
        COALESCE(AVG(quality_score), 0),
        COALESCE(niche, 'Uncategorized'),
        COUNT(*)::BIGINT
    FROM exchange_network
    WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    GROUP BY niche
    ORDER BY site_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE exchange_network IS 'Partner sites in the exchange network for link building and content distribution';
COMMENT ON COLUMN exchange_network.id IS 'Unique identifier for the exchange network site';
COMMENT ON COLUMN exchange_network.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN exchange_network.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN exchange_network.site_id IS 'External identifier for the site from partner systems';
COMMENT ON COLUMN exchange_network.domain IS 'Domain name of the partner site';
COMMENT ON COLUMN exchange_network.authority IS 'Domain authority score (0-100) from SEO metrics providers';
COMMENT ON COLUMN exchange_network.niche IS 'Industry or category niche of the site';
COMMENT ON COLUMN exchange_network.credits_available IS 'Number of credits available for content exchanges';
COMMENT ON COLUMN exchange_network.quality_score IS 'Overall quality score (0-1) based on site metrics';
COMMENT ON COLUMN exchange_network.spam_score IS 'Spam score (0-1) indicating likelihood of spam';
COMMENT ON COLUMN exchange_network.status IS 'Status of the exchange partnership: active, inactive, pending, suspended';
COMMENT ON COLUMN exchange_network.contact_email IS 'Contact email for the partner site';
COMMENT ON COLUMN exchange_network.contact_name IS 'Contact name for the partner site';
COMMENT ON COLUMN exchange_network.notes IS 'Additional notes about the exchange network site';
COMMENT ON COLUMN exchange_network.tags IS 'Tags for categorization and filtering';
COMMENT ON COLUMN exchange_network.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN exchange_network.last_verified_at IS 'Timestamp when the site was last verified';
COMMENT ON COLUMN exchange_network.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON exchange_network TO authenticated;
GRANT ALL ON exchange_network TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_exchange_network TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_exchange_network TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_exchange_network TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_exchange_network TO authenticated;
GRANT EXECUTE ON FUNCTION update_exchange_network_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_exchange_network_credits TO authenticated;
GRANT EXECUTE ON FUNCTION get_exchange_network_stats TO authenticated;
