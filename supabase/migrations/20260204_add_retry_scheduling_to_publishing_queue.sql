-- Migration: Add Retry Scheduling with Exponential Backoff to Publishing Queue
-- Date: 2026-02-04
-- Description: Adds retry_after field for exponential backoff scheduling and improves retry logic

-- Add retry_after column for exponential backoff scheduling
ALTER TABLE publishing_queue
ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ DEFAULT NULL;

-- Add error_type column for error classification (retriable vs non-retriable)
ALTER TABLE publishing_queue
ADD COLUMN IF NOT EXISTS error_type TEXT DEFAULT NULL;

-- Add retry_backoff_ms column to track the current backoff time used
ALTER TABLE publishing_queue
ADD COLUMN IF NOT EXISTS retry_backoff_ms INTEGER DEFAULT NULL;

-- Create index for finding items ready for retry
CREATE INDEX IF NOT EXISTS idx_publishing_queue_retry_after
ON publishing_queue(retry_after)
WHERE retry_after IS NOT NULL
AND status IN ('pending', 'queued')
AND deleted_at IS NULL;

-- Create composite index for processing with retry scheduling
CREATE INDEX IF NOT EXISTS idx_publishing_queue_processing_with_retry
ON publishing_queue(status, priority DESC, created_at ASC, retry_after ASC)
WHERE status IN ('pending', 'queued')
AND deleted_at IS NULL;

-- Update mark_publishing_item_failed to use exponential backoff
CREATE OR REPLACE FUNCTION mark_publishing_item_failed(
    p_item_id UUID,
    p_error_message TEXT,
    p_error_type TEXT DEFAULT 'unknown'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_retries INTEGER;
    v_retry_count INTEGER;
    v_base_backoff_ms INTEGER := 1000; -- Start with 1 second
    v_max_backoff_ms INTEGER := 60000; -- Max 60 seconds
    v_next_backoff_ms INTEGER;
    v_retry_after TIMESTAMPTZ;
BEGIN
    -- Get current retry count and max retries
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
    FROM publishing_queue
    WHERE id = p_item_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Calculate exponential backoff: base * (2 ^ retry_count)
    v_next_backoff_ms := LEAST(
        v_base_backoff_ms * POWER(2, v_retry_count)::INTEGER,
        v_max_backoff_ms
    );

    -- Increment retry count and check if we should retry
    IF v_retry_count < v_max_retries THEN
        v_retry_after := NOW() + (v_next_backoff_ms || ' milliseconds')::INTERVAL;

        UPDATE publishing_queue
        SET status = 'pending',
            retry_count = retry_count + 1,
            last_error = p_error_message,
            last_error_at = NOW(),
            error_type = p_error_type,
            retry_after = v_retry_after,
            retry_backoff_ms = v_next_backoff_ms,
            updated_at = NOW()
        WHERE id = p_item_id;
    ELSE
        -- Max retries reached, mark as permanently failed
        UPDATE publishing_queue
        SET status = 'failed',
            last_error = p_error_message,
            last_error_at = NOW(),
            error_type = p_error_type,
            retry_after = NULL,
            updated_at = NOW()
        WHERE id = p_item_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update retry_publishing_item to reset backoff state
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
        error_type = NULL,
        retry_after = NULL,
        retry_backoff_ms = NULL,
        queued_at = NOW(),
        updated_at = NOW()
    WHERE id = p_item_id
    AND status = 'failed'
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_pending_publishing_items to respect retry_after
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
    scheduled_for TIMESTAMPTZ,
    retry_after TIMESTAMPTZ
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
        pq.scheduled_for,
        pq.retry_after
    FROM publishing_queue pq
    WHERE pq.status IN ('pending', 'queued')
    AND pq.deleted_at IS NULL
    AND (p_platform IS NULL OR pq.platform = p_platform)
    AND (pq.scheduled_for IS NULL OR pq.scheduled_for <= NOW())
    AND (pq.retry_after IS NULL OR pq.retry_after <= NOW())
    ORDER BY pq.priority DESC, pq.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get items ready for retry (useful for cron jobs)
CREATE OR REPLACE FUNCTION get_items_ready_for_retry(
    p_platform publishing_platform DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    article_id UUID,
    platform publishing_platform,
    retry_count INTEGER,
    last_error TEXT,
    error_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pq.id,
        pq.organization_id,
        pq.article_id,
        pq.platform,
        pq.retry_count,
        pq.last_error,
        pq.error_type
    FROM publishing_queue pq
    WHERE pq.status IN ('pending', 'queued')
    AND pq.deleted_at IS NULL
    AND pq.retry_after IS NOT NULL
    AND pq.retry_after <= NOW()
    AND (p_platform IS NULL OR pq.platform = p_platform)
    ORDER BY pq.retry_after ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_items_ready_for_retry TO authenticated;
GRANT EXECUTE ON FUNCTION get_items_ready_for_retry TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN publishing_queue.retry_after IS 'Timestamp after which the item should be retried (exponential backoff)';
COMMENT ON COLUMN publishing_queue.error_type IS 'Type of error that occurred (e.g., network, auth, rate_limit, validation)';
COMMENT ON COLUMN publishing_queue.retry_backoff_ms IS 'The backoff time in milliseconds used for the last retry attempt';
