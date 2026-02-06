-- Migration: Create External Link Opportunities Table
-- Date: 2026-02-05
-- Description: Creates external_link_opportunities table for tracking suggested external links for articles

-- Create external link opportunity status enum type
DO $$ BEGIN
    CREATE TYPE external_link_opportunity_status AS ENUM ('pending', 'approved', 'rejected', 'applied');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create external_link_opportunities table
CREATE TABLE IF NOT EXISTS external_link_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    article_id UUID,
    external_source_id UUID REFERENCES external_link_sources(id) ON DELETE SET NULL,
    keyword TEXT,
    suggested_url TEXT,
    suggested_anchor_text TEXT,
    context_snippet TEXT,
    position_in_content INTEGER,
    relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 100),
    status external_link_opportunity_status DEFAULT 'pending'::external_link_opportunity_status,
    link_type TEXT DEFAULT 'external' CHECK (link_type IN ('external', 'citation', 'reference')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_organization_id ON external_link_opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_product_id ON external_link_opportunities(product_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_article_id ON external_link_opportunities(article_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_external_source_id ON external_link_opportunities(external_source_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_status ON external_link_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_keyword ON external_link_opportunities(keyword);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_relevance_score ON external_link_opportunities(relevance_score);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_suggested_at ON external_link_opportunities(suggested_at);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_deleted_at ON external_link_opportunities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_org_product ON external_link_opportunities(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_org_article ON external_link_opportunities(organization_id, article_id);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_org_status ON external_link_opportunities(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_metadata ON external_link_opportunities USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_external_link_opportunities_created_at ON external_link_opportunities(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_external_link_opportunities_updated_at ON external_link_opportunities;
CREATE TRIGGER update_external_link_opportunities_updated_at
    BEFORE UPDATE ON external_link_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE external_link_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to external_link_opportunities" ON external_link_opportunities;
DROP POLICY IF EXISTS "External link opportunities are viewable by organization members" ON external_link_opportunities;
DROP POLICY IF EXISTS "External link opportunities can be created by organization members" ON external_link_opportunities;
DROP POLICY IF EXISTS "External link opportunities can be updated by organization admins" ON external_link_opportunities;
DROP POLICY IF EXISTS "External link opportunities can be deleted by organization owners" ON external_link_opportunities;

-- RLS Policies for external_link_opportunities table

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to external_link_opportunities"
ON external_link_opportunities
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view opportunities from their organizations
CREATE POLICY "External link opportunities are viewable by organization members"
ON external_link_opportunities
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create opportunities
CREATE POLICY "External link opportunities can be created by organization members"
ON external_link_opportunities
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins can update opportunities
CREATE POLICY "External link opportunities can be updated by organization admins"
ON external_link_opportunities
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete opportunities
CREATE POLICY "External link opportunities can be deleted by organization owners"
ON external_link_opportunities
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = external_link_opportunities.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to get external link opportunities for an article
CREATE OR REPLACE FUNCTION get_article_external_link_opportunities(
    p_article_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status external_link_opportunity_status DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    external_source_id UUID,
    keyword TEXT,
    suggested_url TEXT,
    suggested_anchor_text TEXT,
    context_snippet TEXT,
    relevance_score INTEGER,
    status external_link_opportunity_status,
    link_type TEXT,
    suggested_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            elo.id,
            elo.external_source_id,
            elo.keyword,
            elo.suggested_url,
            elo.suggested_anchor_text,
            elo.context_snippet,
            elo.relevance_score,
            elo.status,
            elo.link_type,
            elo.suggested_at
        FROM external_link_opportunities elo
        WHERE elo.article_id = p_article_id
        AND (p_status IS NULL OR elo.status = p_status)
        ORDER BY elo.relevance_score DESC, elo.suggested_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            elo.id,
            elo.external_source_id,
            elo.keyword,
            elo.suggested_url,
            elo.suggested_anchor_text,
            elo.context_snippet,
            elo.relevance_score,
            elo.status,
            elo.link_type,
            elo.suggested_at
        FROM external_link_opportunities elo
        WHERE elo.article_id = p_article_id
        AND elo.deleted_at IS NULL
        AND (p_status IS NULL OR elo.status = p_status)
        ORDER BY elo.relevance_score DESC, elo.suggested_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get external link opportunities for a product
CREATE OR REPLACE FUNCTION get_product_external_link_opportunities(
    p_product_id UUID,
    p_include_deleted BOOLEAN DEFAULT FALSE,
    p_status external_link_opportunity_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    article_id UUID,
    external_source_id UUID,
    keyword TEXT,
    suggested_url TEXT,
    suggested_anchor_text TEXT,
    relevance_score INTEGER,
    status external_link_opportunity_status,
    suggested_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            elo.id,
            elo.article_id,
            elo.external_source_id,
            elo.keyword,
            elo.suggested_url,
            elo.suggested_anchor_text,
            elo.relevance_score,
            elo.status,
            elo.suggested_at
        FROM external_link_opportunities elo
        WHERE elo.product_id = p_product_id
        AND (p_status IS NULL OR elo.status = p_status)
        ORDER BY elo.relevance_score DESC, elo.suggested_at DESC
        LIMIT p_limit OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT
            elo.id,
            elo.article_id,
            elo.external_source_id,
            elo.keyword,
            elo.suggested_url,
            elo.suggested_anchor_text,
            elo.relevance_score,
            elo.status,
            elo.suggested_at
        FROM external_link_opportunities elo
        WHERE elo.product_id = p_product_id
        AND elo.deleted_at IS NULL
        AND (p_status IS NULL OR elo.status = p_status)
        ORDER BY elo.relevance_score DESC, elo.suggested_at DESC
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update external link opportunity status
CREATE OR REPLACE FUNCTION update_external_link_opportunity_status(
    p_opportunity_id UUID,
    p_status external_link_opportunity_status,
    p_user_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the opportunity's organization_id
    SELECT organization_id INTO v_org_id
    FROM external_link_opportunities
    WHERE id = p_opportunity_id AND deleted_at IS NULL;

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
    UPDATE external_link_opportunities
    SET status = p_status,
        approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
        applied_at = CASE WHEN p_status = 'applied' THEN NOW() ELSE applied_at END
    WHERE id = p_opportunity_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to soft delete an external link opportunity
CREATE OR REPLACE FUNCTION soft_delete_external_link_opportunity(p_opportunity_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the opportunity's organization_id
    SELECT organization_id INTO v_org_id
    FROM external_link_opportunities
    WHERE id = p_opportunity_id AND deleted_at IS NULL;

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

    -- Soft delete the opportunity
    UPDATE external_link_opportunities
    SET deleted_at = NOW()
    WHERE id = p_opportunity_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get external link opportunity statistics
CREATE OR REPLACE FUNCTION get_external_link_opportunity_stats(p_org_id UUID, p_product_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_opportunities BIGINT,
    pending_opportunities BIGINT,
    approved_opportunities BIGINT,
    applied_opportunities BIGINT,
    rejected_opportunities BIGINT,
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
    FROM external_link_opportunities
    WHERE organization_id = p_org_id
    AND (p_product_id IS NULL OR product_id = p_product_id)
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE external_link_opportunities IS 'Suggested external link opportunities for articles based on content analysis';
COMMENT ON COLUMN external_link_opportunities.id IS 'Unique identifier for the external link opportunity';
COMMENT ON COLUMN external_link_opportunities.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN external_link_opportunities.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN external_link_opportunities.article_id IS 'Reference to the article (optional, for article-specific suggestions)';
COMMENT ON COLUMN external_link_opportunities.external_source_id IS 'Reference to the external link source';
COMMENT ON COLUMN external_link_opportunities.keyword IS 'Keyword or topic that triggered this suggestion';
COMMENT ON COLUMN external_link_opportunities.suggested_url IS 'Full URL of the suggested external link';
COMMENT ON COLUMN external_link_opportunities.suggested_anchor_text IS 'Suggested anchor text for the link';
COMMENT ON COLUMN external_link_opportunities.context_snippet IS 'Context from content where this link is relevant';
COMMENT ON COLUMN external_link_opportunities.position_in_content IS 'Suggested position in content (word count or paragraph number)';
COMMENT ON COLUMN external_link_opportunities.relevance_score IS 'Relevance score (0-100) for this suggestion';
COMMENT ON COLUMN external_link_opportunities.status IS 'Status of the opportunity: pending, approved, rejected, applied';
COMMENT ON COLUMN external_link_opportunities.link_type IS 'Type of link: external, citation, reference';
COMMENT ON COLUMN external_link_opportunities.suggested_at IS 'Timestamp when the opportunity was suggested';
COMMENT ON COLUMN external_link_opportunities.approved_at IS 'Timestamp when the opportunity was approved';
COMMENT ON COLUMN external_link_opportunities.applied_at IS 'Timestamp when the link was applied to content';
COMMENT ON COLUMN external_link_opportunities.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON external_link_opportunities TO authenticated;
GRANT ALL ON external_link_opportunities TO service_role;
GRANT EXECUTE ON FUNCTION get_article_external_link_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_external_link_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION update_external_link_opportunity_status TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_external_link_opportunity TO authenticated;
GRANT EXECUTE ON FUNCTION get_external_link_opportunity_stats TO authenticated;
