-- Migration: Create Webhooks Table
-- Date: 2026-02-06
-- Description: Creates webhooks table for storing webhook endpoints with HMAC signature verification

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create webhook event types enum
DO $$ BEGIN
    CREATE TYPE webhook_event_type AS ENUM (
        'article.published',
        'article.updated',
        'article.deleted',
        'article.created',
        'keyword.ranking_changed',
        'backlink.status_changed',
        'subscription.updated',
        'organization.updated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create webhook status enum
DO $$ BEGIN
    CREATE TYPE webhook_status AS ENUM ('active', 'paused', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    event_types webhook_event_type[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL DEFAULT '',
    status webhook_status DEFAULT 'active'::webhook_status,
    headers JSONB DEFAULT '{}'::jsonb,
    last_triggered_at TIMESTAMPTZ DEFAULT NULL,
    last_success_at TIMESTAMPTZ DEFAULT NULL,
    last_failure_at TIMESTAMPTZ DEFAULT NULL,
    failure_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type webhook_event_type NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_deleted_at ON webhooks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_types ON webhooks USING gin(event_types);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_id ON webhook_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_event_type ON webhook_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_delivered_at ON webhook_delivery_logs(delivered_at);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_success ON webhook_delivery_logs(success);

-- Create trigger for automatic updated_at updates on webhooks
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to webhooks" ON webhooks;
DROP POLICY IF EXISTS "Webhooks are viewable by organization members" ON webhooks;
DROP POLICY IF EXISTS "Webhooks can be managed by organization admins" ON webhooks;

DROP POLICY IF EXISTS "Service role has full access to webhook_delivery_logs" ON webhook_delivery_logs;
DROP POLICY IF EXISTS "Webhook delivery logs are viewable by organization members" ON webhook_delivery_logs;

-- RLS Policies for webhooks table

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to webhooks"
ON webhooks
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view webhooks from their organizations
CREATE POLICY "Webhooks are viewable by organization members"
ON webhooks
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = webhooks.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization admins can manage webhooks
CREATE POLICY "Webhooks can be managed by organization admins"
ON webhooks
FOR ALL
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = webhooks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = webhooks.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- RLS Policies for webhook_delivery_logs table

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to webhook_delivery_logs"
ON webhook_delivery_logs
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view delivery logs for their organization's webhooks
CREATE POLICY "Webhook delivery logs are viewable by organization members"
ON webhook_delivery_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM webhooks w
        JOIN organization_members om ON w.organization_id = om.organization_id
        WHERE w.id = webhook_delivery_logs.webhook_id
        AND om.user_id = auth.uid()::text
    )
);

-- Helper function to get webhooks for an organization
CREATE OR REPLACE FUNCTION get_organization_webhooks(
    p_org_id UUID,
    p_status webhook_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    url TEXT,
    event_types webhook_event_type[],
    status webhook_status,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.url,
        w.event_types,
        w.status,
        w.last_triggered_at,
        w.last_success_at,
        w.last_failure_at,
        w.failure_count,
        w.created_at
    FROM webhooks w
    WHERE w.organization_id = p_org_id
    AND w.deleted_at IS NULL
    AND (p_status IS NULL OR w.status = p_status)
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get webhooks for an event
CREATE OR REPLACE FUNCTION get_webhooks_for_event(
    p_org_id UUID,
    p_event_type webhook_event_type
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    url TEXT,
    secret TEXT,
    headers JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.url,
        w.secret,
        w.headers
    FROM webhooks w
    WHERE w.organization_id = p_org_id
    AND w.deleted_at IS NULL
    AND w.status = 'active'::webhook_status
    AND p_event_type = ANY(w.event_types);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to record webhook delivery
CREATE OR REPLACE FUNCTION record_webhook_delivery(
    p_webhook_id UUID,
    p_event_type webhook_event_type,
    p_payload JSONB,
    p_response_status INTEGER DEFAULT NULL,
    p_response_body TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT FALSE,
    p_error_message TEXT DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO webhook_delivery_logs (
        webhook_id,
        event_type,
        payload,
        response_status,
        response_body,
        success,
        error_message,
        duration_ms
    )
    VALUES (
        p_webhook_id,
        p_event_type,
        p_payload,
        p_response_status,
        p_response_body,
        p_success,
        p_error_message,
        p_duration_ms
    )
    RETURNING id INTO v_log_id;

    -- Update webhook stats
    IF p_success THEN
        UPDATE webhooks
        SET last_success_at = NOW(),
            last_triggered_at = NOW(),
            failure_count = 0
        WHERE id = p_webhook_id;
    ELSE
        UPDATE webhooks
        SET last_failure_at = NOW(),
            last_triggered_at = NOW(),
            failure_count = failure_count + 1
        WHERE id = p_webhook_id;
    END IF;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to disable failing webhooks
CREATE OR REPLACE FUNCTION disable_failing_webhook(p_webhook_id UUID, p_failure_threshold INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE webhooks
    SET status = 'disabled'::webhook_status
    WHERE id = p_webhook_id
    AND failure_count >= p_failure_threshold
    AND status != 'disabled'::webhook_status;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE webhooks IS 'Webhook endpoints for external integrations';
COMMENT ON COLUMN webhooks.id IS 'Unique identifier for the webhook';
COMMENT ON COLUMN webhooks.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN webhooks.name IS 'Human-readable name for the webhook';
COMMENT ON COLUMN webhooks.url IS 'Endpoint URL to send webhook payloads to';
COMMENT ON COLUMN webhooks.event_types IS 'Array of event types that trigger this webhook';
COMMENT ON COLUMN webhooks.secret IS 'Secret key for HMAC signature verification';
COMMENT ON COLUMN webhooks.status IS 'Webhook status: active, paused, or disabled';
COMMENT ON COLUMN webhooks.headers IS 'Additional HTTP headers to include in webhook requests';
COMMENT ON COLUMN webhooks.last_triggered_at IS 'Timestamp of the most recent webhook delivery attempt';
COMMENT ON COLUMN webhooks.last_success_at IS 'Timestamp of the most recent successful webhook delivery';
COMMENT ON COLUMN webhooks.last_failure_at IS 'Timestamp of the most recent failed webhook delivery';
COMMENT ON COLUMN webhooks.failure_count IS 'Consecutive failure count';
COMMENT ON COLUMN webhooks.deleted_at IS 'Soft delete timestamp';

COMMENT ON TABLE webhook_delivery_logs IS 'Logs of webhook delivery attempts';
COMMENT ON COLUMN webhook_delivery_logs.webhook_id IS 'Reference to the webhook that was triggered';
COMMENT ON COLUMN webhook_delivery_logs.event_type IS 'Type of event that triggered the webhook';
COMMENT ON COLUMN webhook_delivery_logs.payload IS 'JSON payload sent to the webhook endpoint';
COMMENT ON COLUMN webhook_delivery_logs.response_status IS 'HTTP status code received';
COMMENT ON COLUMN webhook_delivery_logs.response_body IS 'Response body received from the endpoint';
COMMENT ON COLUMN webhook_delivery_logs.delivered_at IS 'Timestamp when the webhook was delivered';
COMMENT ON COLUMN webhook_delivery_logs.success IS 'Whether the delivery was successful';
COMMENT ON COLUMN webhook_delivery_logs.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN webhook_delivery_logs.duration_ms IS 'Time taken for the request in milliseconds';

-- Grant necessary permissions
GRANT ALL ON webhooks TO authenticated;
GRANT ALL ON webhooks TO service_role;
GRANT ALL ON webhook_delivery_logs TO authenticated;
GRANT ALL ON webhook_delivery_logs TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_webhooks TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhooks_for_event TO authenticated;
GRANT EXECUTE ON FUNCTION record_webhook_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION disable_failing_webhook TO authenticated;
