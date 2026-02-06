-- Migration: Create Internal Link Suggestions Table
-- Date: 2026-02-05
-- Description: Creates internal_link_suggestions table for tracking suggested internal links between articles

-- Create internal link suggestion status enum type
DO $$ BEGIN
    CREATE TYPE internal_link_suggestion_status AS ENUM ('pending', 'approved', 'rejected', 'applied');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create internal_link_suggestions table
CREATE TABLE IF NOT EXISTS internal_link_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    source_article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    target_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    keyword TEXT,
    suggested_anchor_text TEXT,
    context_snippet TEXT,
    position_in_content INTEGER,
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
    status internal_link_suggestion_status DEFAULT 'pending'::internal_link_suggestion_status,
    link_type TEXT DEFAULT 'contextual' CHECK (link_type IN ('contextual', 'related', 'see_also', 'further_reading')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    -- Ensure source and target are different articles
    CONSTRAINT source_target_different CHECK (source_article_id IS NULL OR source_article_id != target_article_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_organization_id ON internal_link_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_product_id ON internal_link_suggestions(product_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_source_article_id ON internal_link_suggestions(source_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_target_article_id ON internal_link_suggestions(target_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_status ON internal_link_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_keyword ON internal_link_suggestions(keyword);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_relevance_score ON internal_link_suggestions(relevance_score);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_suggested_at ON internal_link_suggestions(suggested_at);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_deleted_at ON internal_link_suggestions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_org_product ON internal_link_suggestions(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_source_target ON internal_link_suggestions(source_article_id, target_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_org_status ON internal_link_suggestions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_metadata ON internal_link_suggestions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_internal_link_suggestions_created_at ON internal_link_suggestions(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_internal_link_suggestions_updated_at ON internal_link_suggestions;
CREATE TRIGGER update_internal_link_suggestions_updated_at
    BEFORE UPDATE ON internal_link_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE internal_link_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to internal_link_suggestions" ON internal_link_suggestions;
DROP POLICY IF EXISTS "Internal link suggestions are viewable by organization members" ON internal_link_suggestions;
DROP POLICY IF EXISTS "Internal link suggestions can be created by organization members" ON internal_link_suggestions;
DROP POLICY IF EXISTS "Internal link suggestions can be updated by organization admins" ON internal_link_suggestions;
DROP POLICY IF EXISTS "Internal link suggestions can be deleted by organization owners" ON internal_link_suggestions;

-- RLS Policies for internal_link_suggestions table

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to internal_link_suggestions"
ON internal_link_suggestions
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view suggestions from their organizations
CREATE POLICY "Internal link suggestions are viewable by organization members"
ON internal_link_suggestions
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create suggestions
CREATE POLICY "Internal link suggestions can be created by organization members"
ON internal_link_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update suggestions
CREATE POLICY "Internal link suggestions can be updated by organization admins"
ON internal_link_suggestions
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete suggestions
CREATE POLICY "Internal link suggestions can be deleted by organization owners"
ON internal_link_suggestions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = internal_link_suggestions.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get internal link suggestions for an article (as source)
CREATE OR REPLACE FUNCTION get_article_internal_link_suggestions(
    p_article_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status internal_link_suggestion_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    target_article_id UUID,
    keyword TEXT,
    suggested_anchor_text TEXT,
    context_snippet TEXT,
    relevance_score INTEGER,
    status internal_link_suggestion_status,
    link_type TEXT,
    suggested_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            ils.id,
            ils.target_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.context_snippet,
            ils.relevance_score,
            ils.status,
            ils.link_type,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.source_article_id = p_article_id
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            ils.id,
            ils.target_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.context_snippet,
            ils.relevance_score,
            ils.status,
            ils.link_type,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.source_article_id = p_article_id
        AND ils.deleted_at IS NULL
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get articles that link to a given article (as target)
CREATE OR REPLACE FUNCTION get_article_inbound_internal_links(
    p_article_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status internal_link_suggestion_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source_article_id UUID,
    keyword TEXT,
    suggested_anchor_text TEXT,
    relevance_score INTEGER,
    status internal_link_suggestion_status,
    suggested_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            ils.id,
            ils.source_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.relevance_score,
            ils.status,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.target_article_id = p_article_id
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            ils.id,
            ils.source_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.relevance_score,
            ils.status,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.target_article_id = p_article_id
        AND ils.deleted_at IS NULL
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get internal link suggestions for a product
CREATE OR REPLACE FUNCTION get_product_internal_link_suggestions(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status internal_link_suggestion_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    source_article_id UUID,
    target_article_id UUID,
    keyword TEXT,
    suggested_anchor_text TEXT,
    relevance_score INTEGER,
    status internal_link_suggestion_status,
    suggested_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            ils.id,
            ils.source_article_id,
            ils.target_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.relevance_score,
            ils.status,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.product_id = p_product_id
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC
        LIMIT p_limit OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT
            ils.id,
            ils.source_article_id,
            ils.target_article_id,
            ils.keyword,
            ils.suggested_anchor_text,
            ils.relevance_score,
            ils.status,
            ils.suggested_at
        FROM internal_link_suggestions ils
        WHERE ils.product_id = p_product_id
        AND ils.deleted_at IS NULL
        AND (p_status IS NULL OR ils.status = p_status)
        ORDER BY ils.relevance_score DESC, ils.suggested_at DESC
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update internal link suggestion status
CREATE OR REPLACE FUNCTION update_internal_link_suggestion_status(
    p_suggestion_id UUID,
    p_status internal_link_suggestion_status,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the suggestion's organization_id
    SELECT organization_id INTO v_org_id
    FROM internal_link_suggestions
    WHERE id = p_suggestion_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is admin or owner
    IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_org_id
        AND user_id = p_user_id
        AND role IN ('owner', 'admin')
    ) THEN
        RETURN FALSE;
    END IF;

    -- Update the status and set appropriate timestamps
    UPDATE internal_link_suggestions
    SET status = p_status,
        approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
        applied_at = CASE WHEN p_status = 'applied' THEN NOW() ELSE applied_at END
    WHERE id = p_suggestion_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to soft delete an internal link suggestion
CREATE OR REPLACE FUNCTION soft_delete_internal_link_suggestion(p_suggestion_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the suggestion's organization_id
    SELECT organization_id INTO v_org_id
    FROM internal_link_suggestions
    WHERE id = p_suggestion_id AND deleted_at IS NULL;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is owner
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = p_user_id
    AND role = 'owner';

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Soft delete the suggestion
    UPDATE internal_link_suggestions
    SET deleted_at = NOW()
    WHERE id = p_suggestion_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get internal link suggestion statistics
CREATE OR REPLACE FUNCTION get_internal_link_suggestion_stats(p_org_id UUID, p_product_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_suggestions BIGINT,
    pending_suggestions BIGINT,
    approved_suggestions BIGINT,
    applied_suggestions BIGINT,
    rejected_suggestions BIGINT,
    avg_relevance_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'approved')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'applied')::BIGINT,
        COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT,
        ROUND(AVG(relevance_score)::NUMERIC, 2)
    FROM internal_link_suggestions
    WHERE organization_id = p_org_id
    AND (p_product_id IS NULL OR product_id = p_product_id)
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE internal_link_suggestions IS 'Suggested internal links between articles based on semantic content analysis';
COMMENT ON COLUMN internal_link_suggestions.id IS 'Unique identifier for the internal link suggestion';
COMMENT ON COLUMN internal_link_suggestions.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN internal_link_suggestions.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN internal_link_suggestions.source_article_id IS 'Article that should contain the link (optional, null for product-level suggestions)';
COMMENT ON COLUMN internal_link_suggestions.target_article_id IS 'Article to link to (the destination)';
COMMENT ON COLUMN internal_link_suggestions.keyword IS 'Keyword or topic that triggered this suggestion';
COMMENT ON COLUMN internal_link_suggestions.suggested_anchor_text IS 'Suggested anchor text for the link';
COMMENT ON COLUMN internal_link_suggestions.context_snippet IS 'Context from source content where this link is relevant';
COMMENT ON COLUMN internal_link_suggestions.position_in_content IS 'Suggested position in content (word count or paragraph number)';
COMMENT ON COLUMN internal_link_suggestions.relevance_score IS 'Relevance score (0-100) for this suggestion based on semantic analysis';
COMMENT ON COLUMN internal_link_suggestions.status IS 'Status of the suggestion: pending, approved, rejected, applied';
COMMENT ON COLUMN internal_link_suggestions.link_type IS 'Type of internal link: contextual, related, see_also, further_reading';
COMMENT ON COLUMN internal_link_suggestions.suggested_at IS 'Timestamp when the suggestion was generated';
COMMENT ON COLUMN internal_link_suggestions.approved_at IS 'Timestamp when the suggestion was approved';
COMMENT ON COLUMN internal_link_suggestions.applied_at IS 'Timestamp when the link was applied to content';
COMMENT ON COLUMN internal_link_suggestions.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON internal_link_suggestions TO authenticated;
GRANT ALL ON internal_link_suggestions TO service_role;
GRANT EXECUTE ON FUNCTION get_article_internal_link_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_inbound_internal_links TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_internal_link_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION update_internal_link_suggestion_status TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_internal_link_suggestion TO authenticated;
GRANT EXECUTE ON FUNCTION get_internal_link_suggestion_stats TO authenticated;
