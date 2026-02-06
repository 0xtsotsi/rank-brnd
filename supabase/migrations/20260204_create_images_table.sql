-- Migration: Create Images Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates images table with organization_id, product_id, article_id, url, alt_text, style, created_at with relationships to articles

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create image status enum type
DO $$ BEGIN
    CREATE TYPE image_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create images table
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    storage_path TEXT,
    alt_text TEXT,
    caption TEXT,
    title TEXT,
    description TEXT,
    style TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    mime_type TEXT,
    format TEXT,
    status image_status DEFAULT 'completed'::image_status,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_organization_id ON images(organization_id);
CREATE INDEX IF NOT EXISTS idx_images_product_id ON images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_article_id ON images(article_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_deleted_at ON images(deleted_at);
CREATE INDEX IF NOT EXISTS idx_images_url ON images(url);
CREATE INDEX IF NOT EXISTS idx_images_style ON images(style);
CREATE INDEX IF NOT EXISTS idx_images_mime_type ON images(mime_type);
CREATE INDEX IF NOT EXISTS idx_images_metadata ON images USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
CREATE INDEX IF NOT EXISTS idx_images_org_product ON images(organization_id, product_id);
CREATE INDEX IF NOT EXISTS idx_images_org_article ON images(organization_id, article_id);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_images_updated_at ON images;
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to images" ON images;
DROP POLICY IF EXISTS "Images are viewable by organization members" ON images;
DROP POLICY IF EXISTS "Images can be created by organization members" ON images;
DROP POLICY IF EXISTS "Images can be updated by organization admins" ON images;
DROP POLICY IF EXISTS "Images can be deleted by organization owners" ON images;

-- RLS Policies for images table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to images"
ON images
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view images from their organizations (excluding deleted)
CREATE POLICY "Images are viewable by organization members"
ON images
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization members can create images
CREATE POLICY "Images can be created by organization members"
ON images
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization admins and owners can update images
CREATE POLICY "Images can be updated by organization admins"
ON images
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) images
CREATE POLICY "Images can be deleted by organization owners"
ON images
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = images.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete an image
CREATE OR REPLACE FUNCTION soft_delete_image(p_image_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the image's organization_id
    SELECT organization_id INTO v_org_id
    FROM images
    WHERE id = p_image_id AND deleted_at IS NULL;

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

    -- Soft delete the image
    UPDATE images
    SET deleted_at = NOW()
    WHERE id = p_image_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get images for an organization
CREATE OR REPLACE FUNCTION get_organization_images(p_org_id UUID, p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    url TEXT,
    alt_text TEXT,
    title TEXT,
    style TEXT,
    status image_status,
    product_id UUID,
    article_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            i.id,
            i.url,
            i.alt_text,
            i.title,
            i.style,
            i.status,
            i.product_id,
            i.article_id,
            i.created_at,
            i.updated_at
        FROM images i
        WHERE i.organization_id = p_org_id
        ORDER BY i.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            i.id,
            i.url,
            i.alt_text,
            i.title,
            i.style,
            i.status,
            i.product_id,
            i.article_id,
            i.created_at,
            i.updated_at
        FROM images i
        WHERE i.organization_id = p_org_id
        AND i.deleted_at IS NULL
        ORDER BY i.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get images for an article
CREATE OR REPLACE FUNCTION get_article_images(p_article_id UUID)
RETURNS TABLE (
    id UUID,
    url TEXT,
    alt_text TEXT,
    title TEXT,
    style TEXT,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.url,
        i.alt_text,
        i.title,
        i.style,
        i.width,
        i.height,
        i.mime_type,
        i.created_at
    FROM images i
    WHERE i.article_id = p_article_id
    AND i.deleted_at IS NULL
    ORDER BY i.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get images for a product
CREATE OR REPLACE FUNCTION get_product_images(p_product_id UUID)
RETURNS TABLE (
    id UUID,
    url TEXT,
    alt_text TEXT,
    title TEXT,
    style TEXT,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.url,
        i.alt_text,
        i.title,
        i.style,
        i.width,
        i.height,
        i.mime_type,
        i.created_at
    FROM images i
    WHERE i.product_id = p_product_id
    AND i.deleted_at IS NULL
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access an image
CREATE OR REPLACE FUNCTION can_access_image(p_image_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM images i
        JOIN organization_members om ON i.organization_id = om.organization_id
        WHERE i.id = p_image_id
        AND om.user_id = p_user_id
        AND i.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE images IS 'Images stored for organizations, linked to products and articles';
COMMENT ON COLUMN images.id IS 'Unique identifier for the image';
COMMENT ON COLUMN images.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN images.product_id IS 'Reference to the associated product (optional)';
COMMENT ON COLUMN images.article_id IS 'Reference to the associated article (optional)';
COMMENT ON COLUMN images.url IS 'Public URL of the image';
COMMENT ON COLUMN images.storage_path IS 'Storage path within the bucket';
COMMENT ON COLUMN images.alt_text IS 'Alt text for accessibility';
COMMENT ON COLUMN images.caption IS 'Caption text for the image';
COMMENT ON COLUMN images.title IS 'Title of the image';
COMMENT ON COLUMN images.description IS 'Description of the image';
COMMENT ON COLUMN images.style IS 'Style/variant identifier for the image';
COMMENT ON COLUMN images.width IS 'Image width in pixels';
COMMENT ON COLUMN images.height IS 'Image height in pixels';
COMMENT ON COLUMN images.file_size IS 'File size in bytes';
COMMENT ON COLUMN images.mime_type IS 'MIME type of the image (e.g., image/jpeg)';
COMMENT ON COLUMN images.format IS 'Image format (e.g., jpeg, png, webp)';
COMMENT ON COLUMN images.status IS 'Processing status: pending, processing, completed, failed';
COMMENT ON COLUMN images.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN images.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON images TO authenticated;
GRANT ALL ON images TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_image TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_images TO authenticated;
GRANT EXECUTE ON FUNCTION get_article_images TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_images TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_image TO authenticated;
