-- Migration: Add Google Search Console to Integration Platforms
-- Date: 2026-02-04
-- Description: Adds 'google' and 'google-search-console' to the integration_platform enum

-- Add new platform values to the enum
-- Note: PostgreSQL doesn't support altering enum types directly with ADD VALUE before PostgreSQL 12
-- We need to create a new enum type and migrate the data

-- Create new enum type with Google platforms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_platform_new') THEN
        CREATE TYPE integration_platform_new AS ENUM (
            'wordpress',
            'webflow',
            'shopify',
            'ghost',
            'notion',
            'squarespace',
            'wix',
            'contentful',
            'strapi',
            'google',
            'google-search-console',
            'custom'
        );
    END IF;
END $$;

-- Migrate existing columns to use the new enum type
DO $$
BEGIN
    -- Update the integrations table
    ALTER TABLE integrations ALTER COLUMN platform TYPE integration_platform_new USING platform::text::integration_platform_new;
    ALTER TABLE integrations RENAME COLUMN platform TO platform_old;
    ALTER TABLE integrations RENAME COLUMN platform_old TO platform;
    DROP TYPE IF EXISTS integration_platform;
    ALTER TYPE integration_platform_new RENAME TO integration_platform;

    -- Update any check constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_platform_check') THEN
        ALTER TABLE integrations DROP CONSTRAINT integrations_platform_check;
    END IF;
END $$;

-- Update the comment on the platform column
COMMENT ON COLUMN integrations.platform IS 'Platform type: wordpress, webflow, shopify, ghost, notion, squarespace, wix, contentful, strapi, google, google-search-console, custom';
