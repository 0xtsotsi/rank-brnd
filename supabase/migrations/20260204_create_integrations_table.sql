-- Migration: Create Integrations Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates integrations table for third-party platform connections (WordPress, Webflow, Shopify, Ghost, Notion, etc.)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create integration platform enum type
DO $$ BEGIN
    CREATE TYPE integration_platform AS ENUM (
        'wordpress',
        'webflow',
        'shopify',
        'ghost',
        'notion',
        'squarespace',
        'wix',
        'contentful',
        'strapi',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create integration status enum type
DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error', 'pending', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    platform integration_platform NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    auth_token TEXT, -- Should be encrypted at application level
    refresh_token TEXT, -- For OAuth refresh tokens (encrypted)
    auth_type TEXT DEFAULT 'api_key', -- api_key, oauth, bearer_token, basic_auth
    config JSONB DEFAULT '{}'::jsonb, -- Platform-specific configuration (endpoints, webhooks, etc.)
    status integration_status DEFAULT 'active'::integration_status,
    last_synced_at TIMESTAMPTZ DEFAULT NULL,
    last_error TEXT,
    last_error_at TIMESTAMPTZ DEFAULT NULL,
    sync_interval_seconds INTEGER DEFAULT 3600, -- Default 1 hour
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, platform, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_organization_id ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_product_id ON integrations(product_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_deleted_at ON integrations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_integrations_org_platform ON integrations(organization_id, platform);
CREATE INDEX IF NOT EXISTS idx_integrations_config ON integrations USING gin(config);
CREATE INDEX IF NOT EXISTS idx_integrations_metadata ON integrations USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_integrations_last_synced_at ON integrations(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON integrations(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to integrations" ON integrations;
DROP POLICY IF EXISTS "Integrations are viewable by organization members" ON integrations;
DROP POLICY IF EXISTS "Integrations can be created by organization members" ON integrations;
DROP POLICY IF EXISTS "Integrations can be updated by organization admins" ON integrations;
DROP POLICY IF EXISTS "Integrations can be deleted by organization owners" ON integrations;

-- RLS Policies for integrations table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to integrations"
ON integrations
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view integrations from their organizations (excluding deleted)
CREATE POLICY "Integrations are viewable by organization members"
ON integrations
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization owners and admins can create integrations
CREATE POLICY "Integrations can be created by organization members"
ON integrations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization owners and admins can update integrations
CREATE POLICY "Integrations can be updated by organization admins"
ON integrations
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) integrations
CREATE POLICY "Integrations can be deleted by organization owners"
ON integrations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = integrations.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete an integration
CREATE OR REPLACE FUNCTION soft_delete_integration(p_integration_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the integration's organization_id
    SELECT organization_id INTO v_org_id
    FROM integrations
    WHERE id = p_integration_id AND deleted_at IS NULL;

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

    -- Soft delete the integration
    UPDATE integrations
    SET deleted_at = NOW()
    WHERE id = p_integration_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get integrations for an organization
CREATE OR REPLACE FUNCTION get_organization_integrations(p_org_id UUID, p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    platform integration_platform,
    name TEXT,
    description TEXT,
    status integration_status,
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            i.id,
            i.product_id,
            i.platform,
            i.name,
            i.description,
            i.status,
            i.last_synced_at,
            i.last_error,
            i.created_at,
            i.updated_at
        FROM integrations i
        WHERE i.organization_id = p_org_id
        ORDER BY i.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            i.id,
            i.product_id,
            i.platform,
            i.name,
            i.description,
            i.status,
            i.last_synced_at,
            i.last_error,
            i.created_at,
            i.updated_at
        FROM integrations i
        WHERE i.organization_id = p_org_id
        AND i.deleted_at IS NULL
        ORDER BY i.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get integrations for a product
CREATE OR REPLACE FUNCTION get_product_integrations(p_product_id UUID, p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    platform integration_platform,
    name TEXT,
    description TEXT,
    status integration_status,
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            i.id,
            i.organization_id,
            i.platform,
            i.name,
            i.description,
            i.status,
            i.last_synced_at,
            i.last_error,
            i.created_at,
            i.updated_at
        FROM integrations i
        WHERE i.product_id = p_product_id
        ORDER BY i.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            i.id,
            i.organization_id,
            i.platform,
            i.name,
            i.description,
            i.status,
            i.last_synced_at,
            i.last_error,
            i.created_at,
            i.updated_at
        FROM integrations i
        WHERE i.product_id = p_product_id
        AND i.deleted_at IS NULL
        ORDER BY i.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an integration
CREATE OR REPLACE FUNCTION can_access_integration(p_integration_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM integrations i
        JOIN organization_members om ON i.organization_id = om.organization_id
        WHERE i.id = p_integration_id
        AND om.user_id = p_user_id
        AND i.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update integration sync status
CREATE OR REPLACE FUNCTION update_integration_sync_status(
    p_integration_id UUID,
    p_status integration_status,
    p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE integrations
    SET
        last_synced_at = NOW(),
        status = p_status,
        last_error = p_error,
        last_error_at = CASE WHEN p_error IS NOT NULL THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_integration_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE integrations IS 'Third-party platform integrations (WordPress, Webflow, Shopify, Ghost, Notion, etc.)';
COMMENT ON COLUMN integrations.id IS 'Unique identifier for the integration';
COMMENT ON COLUMN integrations.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN integrations.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN integrations.platform IS 'Platform type: wordpress, webflow, shopify, ghost, notion, squarespace, wix, contentful, strapi, custom';
COMMENT ON COLUMN integrations.name IS 'Display name for the integration';
COMMENT ON COLUMN integrations.description IS 'Description of the integration';
COMMENT ON COLUMN integrations.auth_token IS 'Authentication token (should be encrypted at application level)';
COMMENT ON COLUMN integrations.refresh_token IS 'OAuth refresh token (encrypted)';
COMMENT ON COLUMN integrations.auth_type IS 'Authentication type: api_key, oauth, bearer_token, basic_auth';
COMMENT ON COLUMN integrations.config IS 'Platform-specific configuration (endpoints, webhooks, mapping, etc.)';
COMMENT ON COLUMN integrations.status IS 'Integration status: active, inactive, error, pending, revoked';
COMMENT ON COLUMN integrations.last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN integrations.last_error IS 'Last error message (if any)';
COMMENT ON COLUMN integrations.last_error_at IS 'Timestamp of last error';
COMMENT ON COLUMN integrations.sync_interval_seconds IS 'Sync interval in seconds';
COMMENT ON COLUMN integrations.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN integrations.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON integrations TO authenticated;
GRANT ALL ON integrations TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_integration TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_integrations TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_integrations TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_integration TO authenticated;
GRANT EXECUTE ON FUNCTION update_integration_sync_status TO authenticated;
