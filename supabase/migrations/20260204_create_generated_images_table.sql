-- Migration: Create Generated Images Table for DALL-E 3 AI Image Generation
-- Date: 2026-02-04
-- Description: Creates generated_images table for storing AI-generated images with DALL-E 3 metadata, brand color tracking, and prompt revision tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    style TEXT,
    size TEXT NOT NULL DEFAULT '1024x1024',
    quality TEXT NOT NULL DEFAULT 'standard',
    model TEXT NOT NULL DEFAULT 'dall-e-3',
    image_url TEXT NOT NULL,
    storage_path TEXT,
    revised_prompt TEXT,
    brand_colors_applied BOOLEAN DEFAULT FALSE,
    brand_primary_color TEXT,
    brand_secondary_color TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_organization_id ON generated_images(organization_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_model ON generated_images(model);
CREATE INDEX IF NOT EXISTS idx_generated_images_style ON generated_images(style);
CREATE INDEX IF NOT EXISTS idx_generated_images_brand_colors_applied ON generated_images(brand_colors_applied);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_metadata ON generated_images USING gin(metadata);

-- Create composite index for organization queries with sorting
CREATE INDEX IF NOT EXISTS idx_generated_images_org_created ON generated_images(organization_id, created_at DESC);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_generated_images_updated_at ON generated_images;
CREATE TRIGGER update_generated_images_updated_at
    BEFORE UPDATE ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to generated_images" ON generated_images;
DROP POLICY IF EXISTS "Generated images are viewable by organization members" ON generated_images;
DROP POLICY IF EXISTS "Generated images can be created by organization members" ON generated_images;
DROP POLICY IF EXISTS "Generated images can be deleted by organization admins" ON generated_images;

-- RLS Policies for generated_images table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to generated_images"
ON generated_images
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view generated images from their organizations
CREATE POLICY "Generated images are viewable by organization members"
ON generated_images
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = generated_images.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create generated images
CREATE POLICY "Generated images can be created by organization members"
ON generated_images
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = generated_images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
    AND auth.uid()::text = generated_images.user_id
);

-- Policy: Organization admins and owners can delete generated images
CREATE POLICY "Generated images can be deleted by organization admins"
ON generated_images
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = generated_images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Helper function to get generated images for an organization
CREATE OR REPLACE FUNCTION get_organization_generated_images(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    prompt TEXT,
    style TEXT,
    size TEXT,
    quality TEXT,
    model TEXT,
    image_url TEXT,
    revised_prompt TEXT,
    brand_colors_applied BOOLEAN,
    brand_primary_color TEXT,
    brand_secondary_color TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gi.id,
        gi.user_id,
        gi.prompt,
        gi.style,
        gi.size,
        gi.quality,
        gi.model,
        gi.image_url,
        gi.revised_prompt,
        gi.brand_colors_applied,
        gi.brand_primary_color,
        gi.brand_secondary_color,
        gi.created_at
    FROM generated_images gi
    WHERE gi.organization_id = p_org_id
    ORDER BY gi.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get a single generated image by ID
CREATE OR REPLACE FUNCTION get_generated_image(p_image_id UUID, p_org_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id TEXT,
    prompt TEXT,
    style TEXT,
    size TEXT,
    quality TEXT,
    model TEXT,
    image_url TEXT,
    storage_path TEXT,
    revised_prompt TEXT,
    brand_colors_applied BOOLEAN,
    brand_primary_color TEXT,
    brand_secondary_color TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gi.id,
        gi.organization_id,
        gi.user_id,
        gi.prompt,
        gi.style,
        gi.size,
        gi.quality,
        gi.model,
        gi.image_url,
        gi.storage_path,
        gi.revised_prompt,
        gi.brand_colors_applied,
        gi.brand_primary_color,
        gi.brand_secondary_color,
        gi.metadata,
        gi.created_at,
        gi.updated_at
    FROM generated_images gi
    WHERE gi.id = p_image_id
    AND gi.organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to delete a generated image
CREATE OR REPLACE FUNCTION delete_generated_image(p_image_id UUID, p_org_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_storage_path TEXT;
BEGIN
    -- Check if user is admin or owner
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin');

    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get the storage path before deletion
    SELECT storage_path INTO v_storage_path
    FROM generated_images
    WHERE id = p_image_id
    AND organization_id = p_org_id;

    IF v_storage_path IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Delete the image record
    DELETE FROM generated_images
    WHERE id = p_image_id
    AND organization_id = p_org_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE generated_images IS 'AI-generated images via DALL-E 3 with brand color tracking';
COMMENT ON COLUMN generated_images.id IS 'Unique identifier for the generated image';
COMMENT ON COLUMN generated_images.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN generated_images.user_id IS 'User ID who requested the image generation';
COMMENT ON COLUMN generated_images.prompt IS 'Original prompt provided by the user';
COMMENT ON COLUMN generated_images.style IS 'Style applied to the image (realistic, watercolor, illustration, sketch, brand_text_overlay)';
COMMENT ON COLUMN generated_images.size IS 'Image size (1024x1024, 1792x1024, 1024x1792)';
COMMENT ON COLUMN generated_images.quality IS 'Image quality (standard, hd)';
COMMENT ON COLUMN generated_images.model IS 'AI model used (dall-e-3)';
COMMENT ON COLUMN generated_images.image_url IS 'Public URL of the generated image';
COMMENT ON COLUMN generated_images.storage_path IS 'Storage path within the bucket';
COMMENT ON COLUMN generated_images.revised_prompt IS 'Prompt revised by DALL-E for better results';
COMMENT ON COLUMN generated_images.brand_colors_applied IS 'Whether brand colors were applied to the prompt';
COMMENT ON COLUMN generated_images.brand_primary_color IS 'Primary brand color used (hex)';
COMMENT ON COLUMN generated_images.brand_secondary_color IS 'Secondary brand color used (hex)';
COMMENT ON COLUMN generated_images.metadata IS 'Additional metadata (generation time, tokens, etc.)';
COMMENT ON COLUMN generated_images.created_at IS 'Timestamp when the image was generated';
COMMENT ON COLUMN generated_images.updated_at IS 'Timestamp when the record was last updated';

-- Grant necessary permissions
GRANT ALL ON generated_images TO authenticated;
GRANT ALL ON generated_images TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_generated_images TO authenticated;
GRANT EXECUTE ON FUNCTION get_generated_image TO authenticated;
GRANT EXECUTE ON FUNCTION delete_generated_image TO authenticated;
