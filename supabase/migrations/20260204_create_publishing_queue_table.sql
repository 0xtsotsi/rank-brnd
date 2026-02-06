-- Migration: Create Publishing Queue Table
-- Date: 2026-02-04
-- Description: Creates publishing_queue table for tracking article publishing status per CMS platform

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create publishing queue status enum type
DO $$ BEGIN
    CREATE TYPE publishing_queue_status AS ENUM ('pending', 'queued', 'publishing', 'published', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create publishing queue platform enum type
DO $$ BEGIN
    CREATE TYPE publishing_platform AS ENUM ('wordpress', 'webflow', 'shopify', 'ghost', 'notion', 'squarespace', 'wix', 'contentful', 'strapi', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create publishing_queue table
CREATE TABLE IF NOT EXISTS publishing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    platform publishing_platform NOT NULL,
    status publishing_queue_status DEFAULT 'pending'::publishing_queue_status,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    priority INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ DEFAULT NULL,
    queued_at TIMESTAMPTZ DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    published_url TEXT,
    published_post_id TEXT,
    published_data JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_publishing_queue_organization_id ON publishing_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_product_id ON publishing_queue(product_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_article_id ON publishing_queue(article_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_integration_id ON publishing_queue(integration_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_platform ON publishing_queue(platform);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_status ON publishing_queue(status);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_priority ON publishing_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_scheduled_for ON publishing_queue(scheduled_for) WHERE scheduled_for IS NOT NULL AND status IN ('pending', 'queued');
CREATE INDEX IF NOT EXISTS idx_publishing_queue_deleted_at ON publishing_queue(deleted_at);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_org_status ON publishing_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_org_article ON publishing_queue(organization_id, article_id);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_created_at ON publishing_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_retry_count ON publishing_queue(retry_count) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_publishing_queue_metadata ON publishing_queue USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_publishing_queue_published_data ON publishing_queue USING gin(published_data);

-- Create composite index for queue processing
CREATE INDEX IF NOT EXISTS idx_publishing_queue_processing ON publishing_queue(status, priority DESC, created_at ASC)
    WHERE status IN ('pending', 'queued') AND deleted_at IS NULL;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_publishing_queue_updated_at ON publishing_queue;
CREATE TRIGGER update_publishing_queue_updated_at
    BEFORE UPDATE ON publishing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE publishing_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to publishing_queue" ON publishing_queue;
DROP POLICY IF EXISTS "Publishing queue is viewable by organization members" ON publishing_queue;
DROP POLICY IF EXISTS "Publishing queue can be created by organization members" ON publishing_queue;
DROP POLICY IF EXISTS "Publishing queue can be updated by organization admins" ON publishing_queue;
DROP POLICY IF EXISTS "Publishing queue can be deleted by organization owners" ON publishing_queue;

-- RLS Policies for publishing_queue table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to publishing_queue"
ON publishing_queue
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view publishing queue items from their organizations (excluding deleted)
CREATE POLICY "Publishing queue is viewable by organization members"
ON publishing_queue
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create publishing queue items
CREATE POLICY "Publishing queue can be created by organization members"
ON publishing_queue
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update publishing queue items
CREATE POLICY "Publishing queue can be updated by organization admins"
ON publishing_queue
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) publishing queue items
CREATE POLICY "Publishing queue can be deleted by organization owners"
ON publishing_queue
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = publishing_queue.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get publishing queue for an organization
CREATE OR REPLACE FUNCTION get_organization_publishing_queue(
    p_org_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_product_id UUID DEFAULT NULL,
    p_article_id UUID DEFAULT NULL,
    p_status publishing_queue_status DEFAULT NULL,
    p_platform publishing_platform DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    article_id UUID,
    platform publishing_platform,
    status publishing_queue_status,
    retry_count INTEGER,
    priority INTEGER,
    last_error TEXT,
    scheduled_for TIMESTAMPTZ,
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    published_url TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            pq.id,
            pq.article_id,
            pq.platform,
            pq.status,
            pq.retry_count,
            pq.priority,
            pq.last_error,
            pq.scheduled_for,
            pq.queued_at,
            pq.started_at,
            pq.completed_at,
            pq.published_url,
            pq.created_at,
            pq.updated_at
        FROM publishing_queue pq
        WHERE pq.organization_id = p_org_id
        AND (p_product_id IS NULL OR pq.product_id = p_product_id)
        AND (p_article_id IS NULL OR pq.article_id = p_article_id)
        AND (p_status IS NULL OR pq.status = p_status)
        AND (p_platform IS NULL OR pq.platform = p_platform)
        ORDER BY pq.priority DESC, pq.created_at ASC;
    ELSE
        RETURN QUERY
        SELECT
            pq.id,
            pq.article_id,
            pq.platform,
            pq.status,
            pq.retry_count,
            pq.priority,
            pq.last_error,
            pq.scheduled_for,
            pq.queued_at,
            pq.started_at,
            pq.completed_at,
            pq.published_url,
            pq.created_at,
            pq.updated_at
        FROM publishing_queue pq
        WHERE pq.organization_id = p_org_id
        AND pq.deleted_at IS NULL
        AND (p_product_id IS NULL OR pq.product_id = p_product_id)
        AND (p_article_id IS NULL OR pq.article_id = p_article_id)
        AND (p_status IS NULL OR pq.status = p_status)
        AND (p_platform IS NULL OR pq.platform = p_platform)
        ORDER BY pq.priority DESC, pq.created_at ASC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get pending items ready for processing
CREATE OR REPLACE FUNCTION get_pending_publishing_items(
    p_platform publishing_platform DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    article_id UUID,
    integration_id UUID,
    platform publishing_platform,
    priority INTEGER,
    retry_count INTEGER,
    scheduled_for TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pq.id,
        pq.organization_id,
        pq.article_id,
        pq.integration_id,
        pq.platform,
        pq.priority,
        pq.retry_count,
        pq.scheduled_for
    FROM publishing_queue pq
    WHERE pq.status IN ('pending', 'queued')
    AND pq.deleted_at IS NULL
    AND (p_platform IS NULL OR pq.platform = p_platform)
    AND (pq.scheduled_for IS NULL OR pq.scheduled_for <= NOW())
    ORDER BY pq.priority DESC, pq.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark item as publishing
CREATE OR REPLACE FUNCTION mark_publishing_item_started(
    p_item_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE publishing_queue
    SET status = 'publishing',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_item_id
    AND status IN ('pending', 'queued')
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark item as published
CREATE OR REPLACE FUNCTION mark_publishing_item_completed(
    p_item_id UUID,
    p_published_url TEXT DEFAULT NULL,
    p_published_post_id TEXT DEFAULT NULL,
    p_published_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE publishing_queue
    SET status = 'published',
        completed_at = NOW(),
        published_url = p_published_url,
        published_post_id = p_published_post_id,
        published_data = p_published_data,
        updated_at = NOW()
    WHERE id = p_item_id
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to mark item as failed
CREATE OR REPLACE FUNCTION mark_publishing_item_failed(
    p_item_id UUID,
    p_error_message TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_retries INTEGER;
    v_retry_count INTEGER;
BEGIN
    -- Get current retry count and max retries
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
    FROM publishing_queue
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Increment retry count and check if we should retry
    IF v_retry_count < v_max_retries THEN
        UPDATE publishing_queue
        SET status = 'pending',
            retry_count = retry_count + 1,
            last_error = p_error_message,
            last_error_at = NOW(),
            updated_at = NOW()
        WHERE id = p_item_id;
    ELSE
        -- Max retries reached, mark as permanently failed
        UPDATE publishing_queue
        SET status = 'failed',
            last_error = p_error_message,
            last_error_at = NOW(),
            updated_at = NOW()
        WHERE id = p_item_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to queue a new item
CREATE OR REPLACE FUNCTION queue_article_for_publishing(
    p_organization_id UUID,
    p_article_id UUID,
    p_platform publishing_platform,
    p_integration_id UUID DEFAULT NULL,
    p_priority INTEGER DEFAULT 0,
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO publishing_queue (
        organization_id,
        article_id,
        platform,
        integration_id,
        priority,
        scheduled_for,
        status,
        queued_at
    )
    VALUES (
        p_organization_id,
        p_article_id,
        p_platform,
        p_integration_id,
        p_priority,
        p_scheduled_for,
        CASE WHEN p_scheduled_for IS NOT NULL AND p_scheduled_for > NOW() THEN 'pending' ELSE 'queued' END,
        CASE WHEN p_scheduled_for IS NULL OR p_scheduled_for <= NOW() THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to cancel a queued item
CREATE OR REPLACE FUNCTION cancel_publishing_item(
    p_item_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE publishing_queue
    SET status = 'cancelled',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_item_id
    AND status IN ('pending', 'queued')
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to retry a failed item
CREATE OR REPLACE FUNCTION retry_publishing_item(
    p_item_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE publishing_queue
    SET status = 'pending',
        retry_count = 0,
        last_error = NULL,
        last_error_at = NULL,
        queued_at = NOW(),
        updated_at = NOW()
    WHERE id = p_item_id
    AND status = 'failed'
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get publishing queue statistics
CREATE OR REPLACE FUNCTION get_publishing_queue_stats(
    p_org_id UUID
)
RETURNS TABLE (
    platform publishing_platform,
    status publishing_queue_status,
    count BIGINT,
    avg_retry_count NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pq.platform,
        pq.status,
        COUNT(*) as count,
        AVG(pq.retry_count)::NUMERIC(10,2) as avg_retry_count
    FROM publishing_queue pq
    WHERE pq.organization_id = p_org_id
    AND pq.deleted_at IS NULL
    GROUP BY pq.platform, pq.status
    ORDER BY pq.platform, pq.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE publishing_queue IS 'Queue for tracking article publishing status to various CMS platforms';
COMMENT ON COLUMN publishing_queue.id IS 'Unique identifier for the queue item';
COMMENT ON COLUMN publishing_queue.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN publishing_queue.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN publishing_queue.article_id IS 'Reference to the article to be published';
COMMENT ON COLUMN publishing_queue.integration_id IS 'Reference to the CMS integration to use';
COMMENT ON COLUMN publishing_queue.platform IS 'Target CMS platform for publishing';
COMMENT ON COLUMN publishing_queue.status IS 'Current status: pending, queued, publishing, published, failed, cancelled';
COMMENT ON COLUMN publishing_queue.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN publishing_queue.max_retries IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN publishing_queue.priority IS 'Priority level (higher = processed first)';
COMMENT ON COLUMN publishing_queue.last_error IS 'Error message from last failed attempt';
COMMENT ON COLUMN publishing_queue.last_error_at IS 'Timestamp of last error';
COMMENT ON COLUMN publishing_queue.queued_at IS 'Timestamp when item was queued';
COMMENT ON COLUMN publishing_queue.started_at IS 'Timestamp when publishing started';
COMMENT ON COLUMN publishing_queue.completed_at IS 'Timestamp when publishing completed';
COMMENT ON COLUMN publishing_queue.published_url IS 'URL of the published content';
COMMENT ON COLUMN publishing_queue.published_post_id IS 'ID of the published post on the target platform';
COMMENT ON COLUMN publishing_queue.published_data IS 'Additional data from the publish response';
COMMENT ON COLUMN publishing_queue.scheduled_for IS 'Scheduled time for publishing (null for immediate)';
COMMENT ON COLUMN publishing_queue.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN publishing_queue.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON publishing_queue TO authenticated;
GRANT ALL ON publishing_queue TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_publishing_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_publishing_items TO authenticated;
GRANT EXECUTE ON FUNCTION mark_publishing_item_started TO authenticated;
GRANT EXECUTE ON FUNCTION mark_publishing_item_completed TO authenticated;
GRANT EXECUTE ON FUNCTION mark_publishing_item_failed TO authenticated;
GRANT EXECUTE ON FUNCTION queue_article_for_publishing TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_publishing_item TO authenticated;
GRANT EXECUTE ON FUNCTION retry_publishing_item TO authenticated;
GRANT EXECUTE ON FUNCTION get_publishing_queue_stats TO authenticated;
