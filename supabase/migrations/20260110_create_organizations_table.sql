-- Migration: Create/Update Organizations Table with Multi-Tenancy Support
-- Date: 2026-01-10
-- Description: Creates organizations table with tier, settings, and RLS policies for multi-tenancy

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tier enum type
DO $$ BEGIN
    CREATE TYPE organization_tier AS ENUM ('free', 'starter', 'pro', 'agency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organizations table (if not exists, otherwise add missing columns)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    stripe_customer_id TEXT,
    tier organization_tier DEFAULT 'free'::organization_tier,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tier column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN tier organization_tier DEFAULT 'free'::organization_tier;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add settings column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(tier);
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_id ON organizations(clerk_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_settings ON organizations USING gin(settings);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Organizations are viewable by organization members" ON organizations;
DROP POLICY IF EXISTS "Organizations can be created by authenticated users" ON organizations;
DROP POLICY IF EXISTS "Organizations can be updated by organization members" ON organizations;
DROP POLICY IF EXISTS "Organizations can be deleted by organization owners" ON organizations;
DROP POLICY IF EXISTS "Service role has full access to organizations" ON organizations;

-- Create organization_members junction table for multi-tenancy
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user ID
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Create indexes for organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

-- Enable RLS on organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for organization_members
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for organizations table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to organizations"
ON organizations
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view organizations they are members of
CREATE POLICY "Organizations are viewable by organization members"
ON organizations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()::text
    )
    OR clerk_id = auth.uid()::text
);

-- Policy: Authenticated users can create organizations
CREATE POLICY "Organizations can be created by authenticated users"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Organization owners and admins can update
CREATE POLICY "Organizations can be updated by organization members"
ON organizations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
    OR clerk_id = auth.uid()::text
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
    OR clerk_id = auth.uid()::text
);

-- Policy: Only owners can delete organizations
CREATE POLICY "Organizations can be deleted by organization owners"
ON organizations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
    OR clerk_id = auth.uid()::text
);

-- RLS Policies for organization_members table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to organization_members" ON organization_members;
DROP POLICY IF EXISTS "Organization members are viewable by organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage non-owner members" ON organization_members;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to organization_members"
ON organization_members
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Members can view other members in their organizations
CREATE POLICY "Organization members are viewable by organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members AS om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()::text
    )
);

-- Policy: Owners can manage all members
CREATE POLICY "Organization owners can manage members"
ON organization_members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members AS om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()::text
        AND om.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members AS om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()::text
        AND om.role = 'owner'
    )
);

-- Policy: Admins can manage non-owner members
CREATE POLICY "Organization admins can manage non-owner members"
ON organization_members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members AS om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()::text
        AND om.role = 'admin'
    )
    AND role != 'owner'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members AS om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()::text
        AND om.role = 'admin'
    )
    AND role != 'owner'
);

-- Create helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    tier organization_tier,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        o.tier,
        om.role
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is org member
CREATE OR REPLACE FUNCTION is_organization_member(p_org_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = p_org_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user's role in an organization
CREATE OR REPLACE FUNCTION get_organization_role(p_org_id UUID, p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM organization_members
    WHERE organization_id = p_org_id
    AND user_id = p_user_id;

    RETURN COALESCE(v_role, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Organizations (multi-tenant accounts) in the system';
COMMENT ON COLUMN organizations.id IS 'Unique identifier for the organization';
COMMENT ON COLUMN organizations.clerk_id IS 'Clerk organization ID for authentication integration';
COMMENT ON COLUMN organizations.name IS 'Display name of the organization';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN organizations.tier IS 'Subscription tier: free, starter, pro, or agency';
COMMENT ON COLUMN organizations.settings IS 'JSON configuration for organization-specific settings';
COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe customer ID for billing';

COMMENT ON TABLE organization_members IS 'Junction table linking users to organizations with roles';
COMMENT ON COLUMN organization_members.role IS 'User role: owner, admin, member, or viewer';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organizations TO service_role;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON organization_members TO service_role;
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION is_organization_member TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_role TO authenticated;
