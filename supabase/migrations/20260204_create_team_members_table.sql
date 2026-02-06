-- Migration: Create Team Members Table
-- Date: 2026-02-04
-- Description: Creates team_members table for organization user management with invitation/acceptance workflow

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create team member role enum type with editor role (different from organization_members)
DO $$ BEGIN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_member_role DEFAULT 'viewer'::team_member_role,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_org_id ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_invited_at ON team_members(invited_at);
CREATE INDEX IF NOT EXISTS idx_team_members_accepted_at ON team_members(accepted_at);
CREATE INDEX IF NOT EXISTS idx_team_members_org_user ON team_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_created_at ON team_members(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to team_members" ON team_members;
DROP POLICY IF EXISTS "Team members are viewable by organization members" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage all team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage non-owner team members" ON team_members;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON team_members;

-- RLS Policies for team_members table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to team_members"
ON team_members
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view their own team memberships
CREATE POLICY "Users can view their own team memberships"
ON team_members
FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
);

-- Policy: Team members can view other members in their organizations
CREATE POLICY "Team members are viewable by organization members"
ON team_members
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE clerk_id = auth.uid()::text
    )
);

-- Policy: Owners can manage all team members
CREATE POLICY "Team owners can manage all team members"
ON team_members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM team_members AS tm
        WHERE tm.organization_id = team_members.organization_id
        AND tm.user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        AND tm.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM team_members AS tm
        WHERE tm.organization_id = team_members.organization_id
        AND tm.user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        AND tm.role = 'owner'
    )
);

-- Policy: Admins can manage non-owner team members
CREATE POLICY "Team admins can manage non-owner team members"
ON team_members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM team_members AS tm
        WHERE tm.organization_id = team_members.organization_id
        AND tm.user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        AND tm.role = 'admin'
    )
    AND team_members.role != 'owner'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM team_members AS tm
        WHERE tm.organization_id = team_members.organization_id
        AND tm.user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
        AND tm.role = 'admin'
    )
    AND team_members.role != 'owner'
);

-- Helper function to get team members for an organization
CREATE OR REPLACE FUNCTION get_organization_team_members(p_organization_id UUID, p_include_pending BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    role team_member_role,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    is_pending BOOLEAN
) AS $$
BEGIN
    IF p_include_pending THEN
        RETURN QUERY
        SELECT
            tm.id,
            tm.user_id,
            u.email,
            u.name,
            u.avatar_url,
            tm.role,
            tm.invited_at,
            tm.accepted_at,
            (tm.accepted_at IS NULL) AS is_pending
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.organization_id = p_organization_id
        ORDER BY tm.invited_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            tm.id,
            tm.user_id,
            u.email,
            u.name,
            u.avatar_url,
            tm.role,
            tm.invited_at,
            tm.accepted_at,
            (tm.accepted_at IS NULL) AS is_pending
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.organization_id = p_organization_id
        AND tm.accepted_at IS NOT NULL
        ORDER BY tm.invited_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's team memberships
CREATE OR REPLACE FUNCTION get_user_team_memberships(p_user_id TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    organization_name TEXT,
    role team_member_role,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    is_pending BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tm.id,
        tm.organization_id,
        o.name AS organization_name,
        tm.role,
        tm.invited_at,
        tm.accepted_at,
        (tm.accepted_at IS NULL) AS is_pending
    FROM team_members tm
    JOIN organizations o ON tm.organization_id = o.id
    JOIN users u ON tm.user_id = u.id
    WHERE u.clerk_id = p_user_id
    ORDER BY tm.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to add a team member
CREATE OR REPLACE FUNCTION add_team_member(
    p_organization_id UUID,
    p_user_id UUID,
    p_role team_member_role DEFAULT 'viewer'
)
RETURNS UUID AS $$
DECLARE
    v_team_member_id UUID;
BEGIN
    INSERT INTO team_members (organization_id, user_id, role)
    VALUES (p_organization_id, p_user_id, p_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            updated_at = NOW()
    RETURNING id INTO v_team_member_id;

    RETURN v_team_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_team_member_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE team_members
    SET accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_team_member_id
    AND user_id IN (SELECT id FROM users WHERE clerk_id = p_user_id);

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update team member role
CREATE OR REPLACE FUNCTION update_team_member_role(
    p_team_member_id UUID,
    p_new_role team_member_role,
    p_requesting_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_requestor_role team_member_role;
BEGIN
    -- Get the organization and check requestor's permissions
    SELECT tm.organization_id, tm2.role INTO v_org_id, v_requestor_role
    FROM team_members tm
    JOIN users u ON u.clerk_id = p_requesting_user_id
    LEFT JOIN team_members tm2 ON tm2.organization_id = tm.organization_id AND tm2.user_id = u.id
    WHERE tm.id = p_team_member_id;

    -- Only owners and admins can update roles
    IF v_requestor_role NOT IN ('owner', 'admin') THEN
        RETURN FALSE;
    END IF;

    -- Update the role
    UPDATE team_members
    SET role = p_new_role,
        updated_at = NOW()
    WHERE id = p_team_member_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to remove a team member
CREATE OR REPLACE FUNCTION remove_team_member(
    p_team_member_id UUID,
    p_requesting_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_requestor_role team_member_role;
    v_target_role team_member_role;
BEGIN
    -- Get the organization and check requestor's permissions
    SELECT
        tm.organization_id,
        tm2.role AS requestor_role,
        tm.role AS target_role
    INTO v_org_id, v_requestor_role, v_target_role
    FROM team_members tm
    JOIN users u ON u.clerk_id = p_requesting_user_id
    LEFT JOIN team_members tm2 ON tm2.organization_id = tm.organization_id AND tm2.user_id = u.id
    WHERE tm.id = p_team_member_id;

    -- Only owners can remove other owners, admins can remove non-owners
    IF v_target_role = 'owner' AND v_requestor_role != 'owner' THEN
        RETURN FALSE;
    END IF;

    IF v_requestor_role NOT IN ('owner', 'admin') THEN
        RETURN FALSE;
    END IF;

    -- Delete the team member
    DELETE FROM team_members
    WHERE id = p_team_member_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has team role
CREATE OR REPLACE FUNCTION has_team_role(
    p_organization_id UUID,
    p_user_id TEXT,
    p_required_roles team_member_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.organization_id = p_organization_id
        AND u.clerk_id = p_user_id
        AND tm.role = ANY(p_required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's team role
CREATE OR REPLACE FUNCTION get_team_role(p_organization_id UUID, p_user_id TEXT)
RETURNS team_member_role AS $$
DECLARE
    v_role team_member_role;
BEGIN
    SELECT tm.role INTO v_role
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.organization_id = p_organization_id
    AND u.clerk_id = p_user_id;

    RETURN COALESCE(v_role, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE team_members IS 'Team members within organizations with roles and invitation tracking';
COMMENT ON COLUMN team_members.id IS 'Unique identifier for the team membership';
COMMENT ON COLUMN team_members.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN team_members.user_id IS 'Reference to the user (internal UUID)';
COMMENT ON COLUMN team_members.role IS 'User role: owner, admin, editor, or viewer';
COMMENT ON COLUMN team_members.invited_at IS 'Timestamp when the user was invited to the team';
COMMENT ON COLUMN team_members.accepted_at IS 'Timestamp when the invitation was accepted (null if pending)';
COMMENT ON COLUMN team_members.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN team_members.updated_at IS 'Timestamp when the record was last updated';

-- Grant necessary permissions
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_members TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_team_members TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_memberships TO authenticated;
GRANT EXECUTE ON FUNCTION add_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_member_role TO authenticated;
GRANT EXECUTE ON FUNCTION remove_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION has_team_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_role TO authenticated;
