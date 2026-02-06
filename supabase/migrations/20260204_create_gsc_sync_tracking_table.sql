-- Migration: Create GSC Sync Tracking Table
-- Date: 2026-02-04
-- Description: Creates table for tracking GSC sync history and status

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create gsc_sync_status enum type
DO $$ BEGIN
    CREATE TYPE gsc_sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create gsc_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS gsc_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    status gsc_sync_status NOT NULL DEFAULT 'pending'::gsc_sync_status,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    total_records INTEGER DEFAULT 0,
    quota_used INTEGER DEFAULT 0,
    quota_remaining INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_organization_id ON gsc_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_product_id ON gsc_sync_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_integration_id ON gsc_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_site_url ON gsc_sync_logs(site_url);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_status ON gsc_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_started_at ON gsc_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_org_status_started ON gsc_sync_logs(organization_id, status, started_at);

-- Enable Row Level Security
ALTER TABLE gsc_sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to gsc_sync_logs" ON gsc_sync_logs;
DROP POLICY IF EXISTS "GSC sync logs are viewable by organization members" ON gsc_sync_logs;

-- RLS Policies

-- Service role has full access
CREATE POLICY "Service role has full access to gsc_sync_logs"
ON gsc_sync_logs
TO service_role
USING (true)
WITH CHECK (true);

-- Organization members can view sync logs
CREATE POLICY "GSC sync logs are viewable by organization members"
ON gsc_sync_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = gsc_sync_logs.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Helper function to create a new sync log entry
CREATE OR REPLACE FUNCTION create_gsc_sync_log(
    p_organization_id UUID,
    p_product_id UUID,
    p_integration_id UUID,
    p_site_url TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO gsc_sync_logs (
        organization_id,
        product_id,
        integration_id,
        site_url,
        start_date,
        end_date,
        status
    )
    VALUES (
        p_organization_id,
        p_product_id,
        p_integration_id,
        p_site_url,
        p_start_date,
        p_end_date,
        'pending'::gsc_sync_status
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update sync log with results
CREATE OR REPLACE FUNCTION update_gsc_sync_log(
    p_log_id UUID,
    p_status gsc_sync_status,
    p_records_inserted INTEGER DEFAULT NULL,
    p_records_updated INTEGER DEFAULT NULL,
    p_total_records INTEGER DEFAULT NULL,
    p_quota_used INTEGER DEFAULT NULL,
    p_quota_remaining INTEGER DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_error_details JSONB DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE gsc_sync_logs
    SET
        status = p_status,
        records_inserted = COALESCE(p_records_inserted, records_inserted),
        records_updated = COALESCE(p_records_updated, records_updated),
        total_records = COALESCE(p_total_records, total_records),
        quota_used = COALESCE(p_quota_used, quota_used),
        quota_remaining = COALESCE(p_quota_remaining, quota_remaining),
        error_message = COALESCE(p_error_message, error_message),
        error_details = COALESCE(p_error_details, error_details),
        completed_at = NOW(),
        duration_ms = COALESCE(p_duration_ms, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000::INTEGER)
    WHERE id = p_log_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get recent sync logs for an integration
CREATE OR REPLACE FUNCTION get_gsc_sync_logs(
    p_integration_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    integration_id UUID,
    site_url TEXT,
    status gsc_sync_status,
    start_date DATE,
    end_date DATE,
    records_inserted INTEGER,
    records_updated INTEGER,
    total_records INTEGER,
    quota_used INTEGER,
    quota_remaining INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gsl.id,
        gsl.integration_id,
        gsl.site_url,
        gsl.status,
        gsl.start_date,
        gsl.end_date,
        gsl.records_inserted,
        gsl.records_updated,
        gsl.total_records,
        gsl.quota_used,
        gsl.quota_remaining,
        gsl.error_message,
        gsl.started_at,
        gsl.completed_at,
        gsl.duration_ms
    FROM gsc_sync_logs gsl
    WHERE
        (p_integration_id IS NULL OR gsl.integration_id = p_integration_id)
        AND (p_organization_id IS NULL OR gsl.organization_id = p_organization_id)
    ORDER BY gsl.started_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get sync statistics for an organization
CREATE OR REPLACE FUNCTION get_gsc_sync_stats(
    p_organization_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_syncs BIGINT,
    successful_syncs BIGINT,
    failed_syncs BIGINT,
    total_records_synced BIGINT,
    avg_duration_ms NUMERIC,
    last_sync_at TIMESTAMPTZ,
    avg_quota_used_per_sync NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_syncs,
        COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_syncs,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_syncs,
        COALESCE(SUM(total_records), 0)::BIGINT as total_records_synced,
        ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
        MAX(started_at) as last_sync_at,
        ROUND(AVG(quota_used)::NUMERIC, 2) as avg_quota_used_per_sync
    FROM gsc_sync_logs
    WHERE organization_id = p_organization_id
    AND started_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE gsc_sync_logs IS 'Google Search Console sync operation logs';
COMMENT ON COLUMN gsc_sync_logs.id IS 'Unique identifier for the sync log entry';
COMMENT ON COLUMN gsc_sync_logs.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN gsc_sync_logs.product_id IS 'Reference to the product';
COMMENT ON COLUMN gsc_sync_logs.integration_id IS 'Reference to the GSC integration';
COMMENT ON COLUMN gsc_sync_logs.site_url IS 'GSC property URL that was synced';
COMMENT ON COLUMN gsc_sync_logs.status IS 'Sync status: pending, in_progress, completed, failed, cancelled';
COMMENT ON COLUMN gsc_sync_logs.start_date IS 'Start date of synced data range';
COMMENT ON COLUMN gsc_sync_logs.end_date IS 'End date of synced data range';
COMMENT ON COLUMN gsc_sync_logs.records_inserted IS 'Number of new records inserted';
COMMENT ON COLUMN gsc_sync_logs.records_updated IS 'Number of existing records updated';
COMMENT ON COLUMN gsc_sync_logs.total_records IS 'Total records processed';
COMMENT ON COLUMN gsc_sync_logs.quota_used IS 'API quota units used for this sync';
COMMENT ON COLUMN gsc_sync_logs.quota_remaining IS 'API quota units remaining after sync';
COMMENT ON COLUMN gsc_sync_logs.error_message IS 'Error message if sync failed';
COMMENT ON COLUMN gsc_sync_logs.error_details IS 'Additional error details as JSON';
COMMENT ON COLUMN gsc_sync_logs.started_at IS 'When the sync operation started';
COMMENT ON COLUMN gsc_sync_logs.completed_at IS 'When the sync operation completed';
COMMENT ON COLUMN gsc_sync_logs.duration_ms IS 'Duration of sync operation in milliseconds';

-- Grant necessary permissions
GRANT ALL ON gsc_sync_logs TO authenticated;
GRANT ALL ON gsc_sync_logs TO service_role;
GRANT EXECUTE ON FUNCTION create_gsc_sync_log TO service_role;
GRANT EXECUTE ON FUNCTION update_gsc_sync_log TO service_role;
GRANT EXECUTE ON FUNCTION get_gsc_sync_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_gsc_sync_stats TO authenticated;
