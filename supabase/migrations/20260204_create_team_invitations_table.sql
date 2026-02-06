-- Migration: Create Team Invitations Table
-- Date: 2026-02-04
-- Description: Creates team_invitations table for email-based team invitation flow with secure tokens

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create team invitation status enum type
DO $$ BEGIN
    CREATE TYPE team_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role team_member_role DEFAULT 'viewer'::team_member_role,
    token TEXT NOT NULL UNIQUE,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status team_invitation_status DEFAULT 'pending'::team_invitation_status,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_org_id ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_invitations_created_at ON team_invitations(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON team_invitations;
CREATE TRIGGER update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to team_invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can validate invitation by token" ON team_invitations;

-- RLS Policies for team_invitations table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to team_invitations"
ON team_invitations
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Team admins and owners can view invitations for their organization
CREATE POLICY "Team admins can view invitations"
ON team_invitations
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT tm.organization_id
        FROM team_members tm
        JOIN users u ON u.clerk_id = auth.uid()::text AND u.id = tm.user_id
        WHERE tm.role IN ('owner', 'admin')
    )
);

-- Policy: Anyone can validate an invitation using the token (for signup flow)
CREATE POLICY "Anyone can validate invitation by token"
ON team_invitations
FOR SELECT
TO authenticated
USING (
    token IS NOT NULL
    AND status = 'pending'
    AND expires_at > NOW()
);

-- Function to generate a secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a team invitation
CREATE OR REPLACE FUNCTION create_team_invitation(
    p_organization_id UUID,
    p_email TEXT,
    p_role team_member_role DEFAULT 'viewer',
    p_invited_by_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invitation_id UUID;
    v_token TEXT;
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
    -- Check if there's already a pending invitation for this email
    SELECT id INTO v_invitation_id
    FROM team_invitations
    WHERE organization_id = p_organization_id
    AND LOWER(email) = LOWER(p_email)
    AND status = 'pending'
    AND expires_at > NOW();

    -- If pending invitation exists, update it instead
    IF v_invitation_id IS NOT NULL THEN
        UPDATE team_invitations
        SET role = p_role,
            invited_by_user_id = p_invited_by_user_id,
            expires_at = v_expires_at,
            updated_at = NOW()
        WHERE id = v_invitation_id;
    ELSE
        -- Generate a secure token
        v_token := generate_invitation_token();

        -- Create new invitation
        INSERT INTO team_invitations (
            organization_id,
            email,
            role,
            token,
            invited_by_user_id,
            expires_at
        )
        VALUES (
            p_organization_id,
            p_email,
            p_role,
            v_token,
            p_invited_by_user_id,
            v_expires_at
        )
        RETURNING id INTO v_invitation_id;
    END IF;

    RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate an invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    email TEXT,
    role team_member_role,
    invited_by_user_id UUID,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ti.id,
        ti.organization_id,
        ti.email,
        ti.role,
        ti.invited_by_user_id,
        (ti.status = 'pending' AND ti.expires_at > NOW()) AS is_valid
    FROM team_invitations ti
    WHERE ti.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation (creates team member record)
CREATE OR REPLACE FUNCTION accept_team_invitation_by_token(
    p_token TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invitation RECORD;
    v_team_member_id UUID;
BEGIN
    -- Get and lock the invitation
    SELECT * INTO v_invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    FOR UPDATE;

    -- Check if invitation exists and is valid
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Verify email matches
    IF LOWER(v_invitation.email) != (SELECT LOWER(email) FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Invitation email does not match user email';
    END IF;

    -- Create team member record
    INSERT INTO team_members (organization_id, user_id, role, invited_at, accepted_at)
    VALUES (v_invitation.organization_id, p_user_id, v_invitation.role, v_invitation.created_at, NOW())
    ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            accepted_at = NOW(),
            updated_at = NOW()
    RETURNING id INTO v_team_member_id;

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invitation.id;

    RETURN v_team_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel an invitation
CREATE OR REPLACE FUNCTION cancel_team_invitation(
    p_invitation_id UUID,
    p_requesting_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_requestor_role team_member_role;
BEGIN
    -- Get the organization and check requestor's permissions
    SELECT ti.organization_id, tm2.role INTO v_org_id, v_requestor_role
    FROM team_invitations ti
    LEFT JOIN team_members tm2 ON tm2.organization_id = ti.organization_id
    JOIN users u ON u.clerk_id = p_requesting_user_id AND u.id = tm2.user_id
    WHERE ti.id = p_invitation_id;

    -- Only owners and admins can cancel invitations
    IF v_requestor_role NOT IN ('owner', 'admin') THEN
        RETURN FALSE;
    END IF;

    -- Update the invitation status
    UPDATE team_invitations
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_invitation_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending invitations for an organization
CREATE OR REPLACE FUNCTION get_organization_pending_invitations(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role team_member_role,
    token TEXT,
    invited_by_user_id UUID,
    invited_by_name TEXT,
    invited_by_email TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ti.id,
        ti.email,
        ti.role,
        ti.token,
        ti.invited_by_user_id,
        u.name AS invited_by_name,
        u.email AS invited_by_email,
        ti.expires_at,
        ti.created_at
    FROM team_invitations ti
    JOIN users u ON u.id = ti.invited_by_user_id
    WHERE ti.organization_id = p_organization_id
    AND ti.status = 'pending'
    ORDER BY ti.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark expired invitations as expired
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE team_invitations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE team_invitations IS 'Email-based team invitations with secure tokens';
COMMENT ON COLUMN team_invitations.id IS 'Unique identifier for the invitation';
COMMENT ON COLUMN team_invitations.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN team_invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN team_invitations.role IS 'Role to assign when invitation is accepted';
COMMENT ON COLUMN team_invitations.token IS 'Secure token for invitation validation';
COMMENT ON COLUMN team_invitations.invited_by_user_id IS 'User who sent the invitation';
COMMENT ON COLUMN team_invitations.status IS 'Invitation status: pending, accepted, declined, expired, cancelled';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expiration timestamp (default 7 days)';
COMMENT ON COLUMN team_invitations.accepted_at IS 'Timestamp when invitation was accepted';

-- Grant necessary permissions
GRANT ALL ON team_invitations TO authenticated;
GRANT ALL ON team_invitations TO service_role;
GRANT EXECUTE ON FUNCTION generate_invitation_token TO service_role;
GRANT EXECUTE ON FUNCTION create_team_invitation TO service_role;
GRANT EXECUTE ON FUNCTION validate_invitation_token TO authenticated;
GRANT EXECUTE ON FUNCTION accept_team_invitation_by_token TO service_role;
GRANT EXECUTE ON FUNCTION cancel_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_pending_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_invitations TO service_role;
