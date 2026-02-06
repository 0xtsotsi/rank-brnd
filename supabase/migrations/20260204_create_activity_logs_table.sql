-- Migration: Create Activity Logs Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates activity_logs table for tracking user actions across resources with organization_id, user_id, action, resource_type, resource_id, timestamp

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create activity action enum type
DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM ('create', 'update', 'delete', 'publish');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action activity_action NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_timestamp ON activity_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING gin(metadata);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_activity_logs_updated_at ON activity_logs;
CREATE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Activity logs are viewable by organization members" ON activity_logs;
DROP POLICY IF EXISTS "Activity logs can be created by service role" ON activity_logs;

-- RLS Policies for activity_logs table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to activity_logs"
ON activity_logs
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view activity logs from their organizations
CREATE POLICY "Activity logs are viewable by organization members"
ON activity_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = activity_logs.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Only service role can create activity logs (prevents user manipulation)
CREATE POLICY "Activity logs can be created by service role"
ON activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Helper function to create an activity log
CREATE OR REPLACE FUNCTION create_activity_log(
    p_organization_id UUID,
    p_user_id UUID,
    p_action activity_action,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get activity logs for an organization
CREATE OR REPLACE FUNCTION get_organization_activity_logs(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_action activity_action DEFAULT NULL,
    p_resource_type TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    action activity_action,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.organization_id,
        al.user_id,
        u.name,
        u.email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.metadata,
        al.timestamp,
        al.created_at
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.organization_id = p_org_id
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    ORDER BY al.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get activity logs for a specific resource
CREATE OR REPLACE FUNCTION get_resource_activity_logs(
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_organization_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    action activity_action,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.organization_id,
        al.user_id,
        u.name,
        u.email,
        al.action,
        al.resource_type,
        al.resource_id,
        al.metadata,
        al.timestamp
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    WHERE al.resource_type = p_resource_type
    AND al.resource_id = p_resource_id
    AND (p_organization_id IS NULL OR al.organization_id = p_organization_id)
    ORDER BY al.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get activity count by action type for an organization
CREATE OR REPLACE FUNCTION get_activity_stats(
    p_org_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    action activity_action,
    count BIGINT,
    resource_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.action,
        COUNT(*) as count,
        al.resource_type
    FROM activity_logs al
    WHERE al.organization_id = p_org_id
    AND (p_start_date IS NULL OR al.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR al.timestamp <= p_end_date)
    GROUP BY al.action, al.resource_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE activity_logs IS 'Activity logs tracking user actions across resources within organizations';
COMMENT ON COLUMN activity_logs.id IS 'Unique identifier for the activity log entry';
COMMENT ON COLUMN activity_logs.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN activity_logs.user_id IS 'Reference to the user who performed the action';
COMMENT ON COLUMN activity_logs.action IS 'Type of action performed: create, update, delete, publish';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource affected (e.g., "keyword", "article", "product")';
COMMENT ON COLUMN activity_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional metadata about the action (e.g., changes made, old values)';
COMMENT ON COLUMN activity_logs.timestamp IS 'When the action occurred';
COMMENT ON COLUMN activity_logs.created_at IS 'When the log entry was created';
COMMENT ON COLUMN activity_logs.updated_at IS 'When the log entry was last updated';

-- Grant necessary permissions
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON activity_logs TO service_role;
GRANT EXECUTE ON FUNCTION create_activity_log TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_resource_activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_stats TO authenticated;
