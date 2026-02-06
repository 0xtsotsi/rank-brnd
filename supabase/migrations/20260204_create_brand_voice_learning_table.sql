-- Migration: Create Brand Voice Learning Table
-- Date: 2026-02-04
-- Description: Creates brand_voice_learning table to store brand voice samples with organization_id, product_id, sample_text, and analysis (tone, vocabulary, style)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create brand voice analysis status enum type
DO $$ BEGIN
    CREATE TYPE brand_voice_analysis_status AS ENUM ('pending', 'analyzing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create brand_voice_learning table
CREATE TABLE IF NOT EXISTS brand_voice_learning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sample_text TEXT NOT NULL,
    source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'website', 'document', 'article', 'product_page')),
    analysis JSONB DEFAULT '{
        "tone": [],
        "vocabulary": {},
        "style": {},
        "sentiment": null,
        "formality_level": null,
        "keywords": []
    }'::jsonb,
    analysis_status brand_voice_analysis_status DEFAULT 'pending'::brand_voice_analysis_status,
    analysis_error TEXT,
    confidence_score DECIMAL(3, 2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_organization_id ON brand_voice_learning(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_product_id ON brand_voice_learning(product_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_analysis_status ON brand_voice_learning(analysis_status);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_source_type ON brand_voice_learning(source_type);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_created_at ON brand_voice_learning(created_at);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_confidence_score ON brand_voice_learning(confidence_score);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_analysis ON brand_voice_learning USING gin(analysis);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_metadata ON brand_voice_learning USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_brand_voice_learning_org_product ON brand_voice_learning(organization_id, product_id);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_brand_voice_learning_updated_at ON brand_voice_learning;
CREATE TRIGGER update_brand_voice_learning_updated_at
    BEFORE UPDATE ON brand_voice_learning
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE brand_voice_learning ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to brand_voice_learning" ON brand_voice_learning;
DROP POLICY IF EXISTS "Brand voice samples are viewable by organization members" ON brand_voice_learning;
DROP POLICY IF EXISTS "Brand voice samples can be created by organization members" ON brand_voice_learning;
DROP POLICY IF EXISTS "Brand voice samples can be updated by organization admins" ON brand_voice_learning;
DROP POLICY IF EXISTS "Brand voice samples can be deleted by organization admins" ON brand_voice_learning;

-- RLS Policies for brand_voice_learning table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to brand_voice_learning"
ON brand_voice_learning
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view brand voice samples from their organizations
CREATE POLICY "Brand voice samples are viewable by organization members"
ON brand_voice_learning
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = brand_voice_learning.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create brand voice samples
CREATE POLICY "Brand voice samples can be created by organization members"
ON brand_voice_learning
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = brand_voice_learning.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization owners and admins can update brand voice samples
CREATE POLICY "Brand voice samples can be updated by organization admins"
ON brand_voice_learning
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = brand_voice_learning.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = brand_voice_learning.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Organization owners and admins can delete brand voice samples
CREATE POLICY "Brand voice samples can be deleted by organization admins"
ON brand_voice_learning
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = brand_voice_learning.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Helper function to get brand voice samples for an organization
CREATE OR REPLACE FUNCTION get_organization_brand_voice_samples(p_org_id UUID, p_product_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    sample_text TEXT,
    source_type TEXT,
    analysis JSONB,
    analysis_status brand_voice_analysis_status,
    confidence_score DECIMAL(3, 2),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_product_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            bvl.id,
            bvl.product_id,
            LEFT(bvl.sample_text, 200) as sample_text,
            bvl.source_type,
            bvl.analysis,
            bvl.analysis_status,
            bvl.confidence_score,
            bvl.created_at
        FROM brand_voice_learning bvl
        WHERE bvl.organization_id = p_org_id
        AND bvl.product_id = p_product_id
        ORDER BY bvl.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            bvl.id,
            bvl.product_id,
            LEFT(bvl.sample_text, 200) as sample_text,
            bvl.source_type,
            bvl.analysis,
            bvl.analysis_status,
            bvl.confidence_score,
            bvl.created_at
        FROM brand_voice_learning bvl
        WHERE bvl.organization_id = p_org_id
        ORDER BY bvl.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get aggregated brand voice analysis for a product
CREATE OR REPLACE FUNCTION get_product_brand_voice_analysis(p_product_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_analysis JSONB := '{
        "tone": {},
        "vocabulary": {},
        "style": {},
        "sentiment_distribution": {},
        "avg_confidence": 0,
        "sample_count": 0
    }'::jsonb;
BEGIN
    -- Get completed analyses only
    SELECT jsonb_build_object(
        'tone', jsonb_agg(DISTINCT jsonb_build_object(
            'value', bvl.analysis->>'tone',
            'count', COUNT(*)
        )),
        'vocabulary', jsonb_object_agg(
            COALESCE(bvl.analysis->'vocabulary'->>'category', 'general'),
            COUNT(*)
        ),
        'style', jsonb_object_agg(
            COALESCE(bvl.analysis->'style'->>'type', 'neutral'),
            COUNT(*)
        ),
        'sentiment_distribution', jsonb_build_object(
            'positive', COUNT(*) FILTER (WHERE bvl.analysis->>'sentiment' = 'positive'),
            'neutral', COUNT(*) FILTER (WHERE bvl.analysis->>'sentiment' = 'neutral'),
            'negative', COUNT(*) FILTER (WHERE bvl.analysis->>'sentiment' = 'negative')
        ),
        'avg_confidence', COALESCE(AVG(bvl.confidence_score), 0),
        'sample_count', COUNT(*)
    ) INTO v_analysis
    FROM brand_voice_learning bvl
    WHERE bvl.product_id = p_product_id
    AND bvl.analysis_status = 'completed';

    RETURN v_analysis;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a brand voice sample
CREATE OR REPLACE FUNCTION can_access_brand_voice_sample(p_sample_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM brand_voice_learning bvl
        JOIN organization_members om ON bvl.organization_id = om.organization_id
        WHERE bvl.id = p_sample_id
        AND om.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create brand voice sample with analysis
CREATE OR REPLACE FUNCTION create_brand_voice_sample(
    p_organization_id UUID,
    p_product_id UUID,
    p_sample_text TEXT,
    p_source_type TEXT DEFAULT 'manual',
    p_user_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_sample_id UUID;
BEGIN
    -- Insert the new brand voice sample
    INSERT INTO brand_voice_learning (
        organization_id,
        product_id,
        sample_text,
        source_type,
        analysis_status
    ) VALUES (
        p_organization_id,
        p_product_id,
        p_sample_text,
        p_source_type,
        'pending'::brand_voice_analysis_status
    ) RETURNING id INTO v_sample_id;

    RETURN v_sample_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE brand_voice_learning IS 'Brand voice samples used to learn and analyze brand communication style';
COMMENT ON COLUMN brand_voice_learning.id IS 'Unique identifier for the brand voice sample';
COMMENT ON COLUMN brand_voice_learning.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN brand_voice_learning.product_id IS 'Optional reference to a specific product';
COMMENT ON COLUMN brand_voice_learning.sample_text IS 'The text sample to analyze for brand voice';
COMMENT ON COLUMN brand_voice_learning.source_type IS 'Source of the sample: manual, website, document, article, product_page';
COMMENT ON COLUMN brand_voice_learning.analysis IS 'JSON object containing tone, vocabulary, style analysis';
COMMENT ON COLUMN brand_voice_learning.analysis_status IS 'Status of the analysis: pending, analyzing, completed, failed';
COMMENT ON COLUMN brand_voice_learning.analysis_error IS 'Error message if analysis failed';
COMMENT ON COLUMN brand_voice_learning.confidence_score IS 'Confidence score of the analysis (0.00 to 1.00)';
COMMENT ON COLUMN brand_voice_learning.metadata IS 'Additional metadata as JSON';

-- Grant necessary permissions
GRANT ALL ON brand_voice_learning TO authenticated;
GRANT ALL ON brand_voice_learning TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_brand_voice_samples TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_brand_voice_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_brand_voice_sample TO authenticated;
GRANT EXECUTE ON FUNCTION create_brand_voice_sample TO authenticated;
