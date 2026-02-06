-- Migration: Create Data Exports Table for GDPR Compliance
-- Date: 2026-02-05
-- Description: Creates data_exports table for tracking and managing GDPR data export requests

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create export status enum type
DO $$ BEGIN
    CREATE TYPE data_export_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create export format enum type
DO $$ BEGIN
    CREATE TYPE data_export_format AS ENUM ('json', 'csv');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create data exports table
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status data_export_status DEFAULT 'pending'::data_export_status,
    format data_export_format NOT NULL,
    file_url TEXT,
    file_size_bytes INTEGER,
    record_count INTEGER DEFAULT 0,
    requested_tables TEXT[] DEFAULT '{}',
    include_deleted BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_exports_organization_id ON data_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires_at ON data_exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_data_exports_created_at ON data_exports(created_at);
CREATE INDEX IF NOT EXISTS idx_data_exports_org_status ON data_exports(organization_id, status);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_data_exports_updated_at ON data_exports;
CREATE TRIGGER update_data_exports_updated_at
    BEFORE UPDATE ON data_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to data_exports" ON data_exports;
DROP POLICY IF EXISTS "Data exports are viewable by organization members" ON data_exports;
DROP POLICY IF EXISTS "Data exports can be created by organization members" ON data_exports;

-- RLS Policies for data_exports table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to data_exports"
ON data_exports
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view exports from their organizations
CREATE POLICY "Data exports are viewable by organization members"
ON data_exports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = data_exports.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create exports
CREATE POLICY "Data exports can be created by organization members"
ON data_exports
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
    AND user_id = auth.uid()::text
);

-- Helper function to request a data export
CREATE OR REPLACE FUNCTION request_data_export(
    p_organization_id UUID,
    p_user_id TEXT,
    p_format data_export_format,
    p_requested_tables TEXT[] DEFAULT NULL,
    p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    v_export_id UUID;
BEGIN
    -- Create the export request
    INSERT INTO data_exports (
        organization_id,
        user_id,
        status,
        format,
        requested_tables,
        include_deleted
    )
    VALUES (
        p_organization_id,
        p_user_id,
        'pending',
        p_format,
        COALESCE(p_requested_tables, ARRAY[]::TEXT[]),
        p_include_deleted
    )
    RETURNING id INTO v_export_id;

    RETURN v_export_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get pending exports for processing
CREATE OR REPLACE FUNCTION get_pending_data_exports(
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id TEXT,
    format data_export_format,
    requested_tables TEXT[],
    include_deleted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.organization_id,
        de.user_id,
        de.format,
        de.requested_tables,
        de.include_deleted
    FROM data_exports de
    WHERE de.status = 'pending'
    ORDER BY de.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark export as processing
CREATE OR REPLACE FUNCTION mark_export_processing(
    p_export_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE data_exports
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = p_export_id AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark export as completed
CREATE OR REPLACE FUNCTION mark_export_completed(
    p_export_id UUID,
    p_file_url TEXT,
    p_file_size_bytes INTEGER,
    p_record_count INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE data_exports
    SET status = 'completed',
        file_url = p_file_url,
        file_size_bytes = p_file_size_bytes,
        record_count = p_record_count,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_export_id AND status = 'processing';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark export as failed
CREATE OR REPLACE FUNCTION mark_export_failed(
    p_export_id UUID,
    p_error_message TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE data_exports
    SET status = 'failed',
        error_message = p_error_message,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_export_id AND status IN ('pending', 'processing');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get organization data exports
CREATE OR REPLACE FUNCTION get_organization_data_exports(
    p_organization_id UUID,
    p_include_expired BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    status data_export_status,
    format data_export_format,
    file_url TEXT,
    file_size_bytes INTEGER,
    record_count INTEGER,
    error_message TEXT,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_expired THEN
        RETURN QUERY
        SELECT
            de.id,
            de.user_id,
            de.status,
            de.format,
            de.file_url,
            de.file_size_bytes,
            de.record_count,
            de.error_message,
            de.expires_at,
            de.completed_at,
            de.created_at
        FROM data_exports de
        WHERE de.organization_id = p_organization_id
        ORDER BY de.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            de.id,
            de.user_id,
            de.status,
            de.format,
            de.file_url,
            de.file_size_bytes,
            de.record_count,
            de.error_message,
            de.expires_at,
            de.completed_at,
            de.created_at
        FROM data_exports de
        WHERE de.organization_id = p_organization_id
        AND (de.expires_at IS NULL OR de.expires_at > NOW())
        ORDER BY de.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access export
CREATE OR REPLACE FUNCTION can_access_data_export(
    p_export_id UUID,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM data_exports de
        JOIN organization_members om ON de.organization_id = om.organization_id
        WHERE de.id = p_export_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE data_exports IS 'GDPR data export requests for organizations with tracking and file storage';
COMMENT ON COLUMN data_exports.id IS 'Unique identifier for the export request';
COMMENT ON COLUMN data_exports.organization_id IS 'Reference to the organization requesting the export';
COMMENT ON COLUMN data_exports.user_id IS 'ID of the user who requested the export';
COMMENT ON COLUMN data_exports.status IS 'Export status: pending, processing, completed, failed, expired';
COMMENT ON COLUMN data_exports.format IS 'Export file format: json or csv';
COMMENT ON COLUMN data_exports.file_url IS 'URL to download the exported file';
COMMENT ON COLUMN data_exports.file_size_bytes IS 'Size of the exported file in bytes';
COMMENT ON COLUMN data_exports.record_count IS 'Total number of records exported';
COMMENT ON COLUMN data_exports.requested_tables IS 'Array of table names to include in the export';
COMMENT ON COLUMN data_exports.include_deleted IS 'Whether to include soft-deleted records';
COMMENT ON COLUMN data_exports.error_message IS 'Error message if export failed';
COMMENT ON COLUMN data_exports.expires_at IS 'Timestamp when the export file expires (7 days after creation)';
COMMENT ON COLUMN data_exports.completed_at IS 'Timestamp when export processing completed';

-- Grant necessary permissions
GRANT ALL ON data_exports TO authenticated;
GRANT ALL ON data_exports TO service_role;
GRANT EXECUTE ON FUNCTION request_data_export TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_data_exports TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_data_export TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_data_exports TO service_role;
GRANT EXECUTE ON FUNCTION mark_export_processing TO service_role;
GRANT EXECUTE ON FUNCTION mark_export_completed TO service_role;
GRANT EXECUTE ON FUNCTION mark_export_failed TO service_role;
