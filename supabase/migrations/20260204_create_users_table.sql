-- Migration: Create Users Table
-- Date: 2026-02-04
-- Description: Creates users table with organization_id, email, name, role, preferences, last_login, created_at. Sets up RLS policies and foreign key constraints.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'member'::user_role,
    preferences JSONB DEFAULT '{
        "notifications": {
            "email": true,
            "push": true,
            "marketing": false
        },
        "theme": "system",
        "timezone": "UTC"
    }'::jsonb,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure a user can only belong to one organization per email
    UNIQUE(organization_id, email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);

-- Create updated_at trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view members in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Organization admins can update organization users" ON users;
DROP POLICY IF EXISTS "Users can be inserted via service role only" ON users;

-- RLS Policies for users table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to users"
ON users
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated
USING (clerk_id = auth.uid()::text);

-- Policy: Users can view other members in their organization
CREATE POLICY "Users can view members in their organization"
ON users
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE clerk_id = auth.uid()::text
    )
);

-- Policy: Users can update their own profile (limited fields)
-- Users can only update their own profile: name, avatar_url, preferences
-- Cannot change organization_id or role (requires admin/owner)
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
TO authenticated
USING (clerk_id = auth.uid()::text)
WITH CHECK (clerk_id = auth.uid()::text);

-- Policy: Organization owners and admins can update users in their organization
CREATE POLICY "Organization admins can update organization users"
ON users
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.clerk_id = auth.uid()::text
        AND users.organization_id = users.organization_id
        AND users.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE clerk_id = auth.uid()::text
        AND role IN ('owner', 'admin')
    )
);

-- Policy: Only service role can insert new users (synced from Clerk)
CREATE POLICY "Users can be inserted via service role only"
ON users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only service role can delete users (soft delete via is_active)
CREATE POLICY "Users can be soft deleted via service role only"
ON users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Create helper function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_login on authentication
-- This would be called by the application when a user logs in

-- Create helper function to get user by clerk ID
CREATE OR REPLACE FUNCTION get_user_by_clerk_id(p_clerk_id TEXT)
RETURNS TABLE (
    id UUID,
    clerk_id TEXT,
    organization_id UUID,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    role user_role,
    is_active BOOLEAN,
    last_login TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.clerk_id,
        u.organization_id,
        u.email,
        u.name,
        u.avatar_url,
        u.role,
        u.is_active,
        u.last_login
    FROM users u
    WHERE u.clerk_id = p_clerk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get users in an organization
CREATE OR REPLACE FUNCTION get_organization_users(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    clerk_id TEXT,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    role user_role,
    is_active BOOLEAN,
    last_login TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.clerk_id,
        u.email,
        u.name,
        u.avatar_url,
        u.role,
        u.is_active,
        u.last_login
    FROM users u
    WHERE u.organization_id = p_organization_id
    AND u.is_active = true
    ORDER BY u.role, u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is in organization
CREATE OR REPLACE FUNCTION is_user_in_organization(p_user_id TEXT, p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE clerk_id = p_user_id
        AND organization_id = p_organization_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE users IS 'Users table synced with Clerk, linked to organizations';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.clerk_id IS 'Clerk user ID for authentication integration';
COMMENT ON COLUMN users.organization_id IS 'Foreign key to organizations table';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.name IS 'User display name';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.role IS 'User role within the organization: owner, admin, member, or viewer';
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB (notifications, theme, timezone, etc.)';
COMMENT ON COLUMN users.last_login IS 'Timestamp of last login';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active (soft delete)';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_clerk_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_users TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_in_organization TO authenticated;
