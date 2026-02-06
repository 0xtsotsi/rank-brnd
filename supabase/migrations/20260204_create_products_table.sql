-- Migration: Create Products Table with Multi-Tenancy Support
-- Date: 2026-02-04
-- Description: Creates products table for websites with organization_id, name, url, brand_colors, tone_preferences, analytics_config

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create product status enum type
DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('active', 'archived', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    url TEXT,
    description TEXT,
    status product_status DEFAULT 'active'::product_status,
    brand_colors JSONB DEFAULT '{"primary": "#000000", "secondary": "#666666", "accent": "#3b82f6"}'::jsonb,
    tone_preferences JSONB DEFAULT '{"tone": "professional", "voice": "formal"}'::jsonb,
    analytics_config JSONB DEFAULT '{"enabled": false, "tracking_id": null}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(organization_id, slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_org_slug ON products(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_brand_colors ON products USING gin(brand_colors);
CREATE INDEX IF NOT EXISTS idx_products_tone_preferences ON products USING gin(tone_preferences);
CREATE INDEX IF NOT EXISTS idx_products_analytics_config ON products USING gin(analytics_config);
CREATE INDEX IF NOT EXISTS idx_products_metadata ON products USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to products" ON products;
DROP POLICY IF EXISTS "Products are viewable by organization members" ON products;
DROP POLICY IF EXISTS "Products can be created by organization members" ON products;
DROP POLICY IF EXISTS "Products can be updated by organization admins" ON products;
DROP POLICY IF EXISTS "Products can be deleted by organization owners" ON products;

-- RLS Policies for products table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to products"
ON products
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view products from their organizations (excluding deleted)
CREATE POLICY "Products are viewable by organization members"
ON products
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Organization owners and admins can create products
CREATE POLICY "Products can be created by organization members"
ON products
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin', 'member')
    )
);

-- Policy: Organization owners and admins can update products
CREATE POLICY "Products can be updated by organization admins"
ON products
FOR UPDATE
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- Policy: Only owners can delete (soft delete) products
CREATE POLICY "Products can be deleted by organization owners"
ON products
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = products.organization_id
        AND organization_members.user_id = auth.uid()::text
        AND organization_members.role = 'owner'
    )
);

-- Helper function to soft delete a product
CREATE OR REPLACE FUNCTION soft_delete_product(p_product_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the product's organization_id
    SELECT organization_id INTO v_org_id
    FROM products
    WHERE id = p_product_id AND deleted_at IS NULL;

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

    -- Soft delete the product
    UPDATE products
    SET deleted_at = NOW()
    WHERE id = p_product_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get products for an organization
CREATE OR REPLACE FUNCTION get_organization_products(p_org_id UUID, p_include_deleted BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    url TEXT,
    status product_status,
    brand_colors JSONB,
    tone_preferences JSONB,
    analytics_config JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF p_include_deleted THEN
        RETURN QUERY
        SELECT
            p.id,
            p.name,
            p.slug,
            p.url,
            p.status,
            p.brand_colors,
            p.tone_preferences,
            p.analytics_config,
            p.created_at,
            p.updated_at
        FROM products p
        WHERE p.organization_id = p_org_id
        ORDER BY p.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT
            p.id,
            p.name,
            p.slug,
            p.url,
            p.status,
            p.brand_colors,
            p.tone_preferences,
            p.analytics_config,
            p.created_at,
            p.updated_at
        FROM products p
        WHERE p.organization_id = p_org_id
        AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access a product
CREATE OR REPLACE FUNCTION can_access_product(p_product_id UUID, p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM products p
        JOIN organization_members om ON p.organization_id = om.organization_id
        WHERE p.id = p_product_id
        AND om.user_id = p_user_id
        AND p.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE products IS 'Products/websites owned by organizations';
COMMENT ON COLUMN products.id IS 'Unique identifier for the product';
COMMENT ON COLUMN products.organization_id IS 'Reference to the owning organization';
COMMENT ON COLUMN products.name IS 'Display name of the product/website';
COMMENT ON COLUMN products.slug IS 'URL-friendly unique identifier within organization';
COMMENT ON COLUMN products.url IS 'Website URL for the product';
COMMENT ON COLUMN products.description IS 'Description of the product/website';
COMMENT ON COLUMN products.status IS 'Status: active, archived, or pending';
COMMENT ON COLUMN products.brand_colors IS 'JSON object with brand color scheme (primary, secondary, accent)';
COMMENT ON COLUMN products.tone_preferences IS 'JSON object with content tone preferences';
COMMENT ON COLUMN products.analytics_config IS 'JSON object with analytics integration settings';
COMMENT ON COLUMN products.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO service_role;
GRANT EXECUTE ON FUNCTION soft_delete_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_products TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_product TO authenticated;
