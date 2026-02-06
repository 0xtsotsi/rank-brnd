-- Migration: Create Invoices Table
-- Date: 2026-02-04
-- Description: Creates invoices table for payment history and invoice tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create invoice status enum type
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('paid', 'open', 'void', 'uncollectible', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    status invoice_status NOT NULL DEFAULT 'open',
    invoice_pdf TEXT,
    hosted_invoice_url TEXT,
    due_date TIMESTAMPTZ DEFAULT NULL,
    paid_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);
CREATE INDEX IF NOT EXISTS idx_invoices_metadata ON invoices USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to invoices" ON invoices;
DROP POLICY IF EXISTS "Invoices are viewable by organization members" ON invoices;
DROP POLICY IF EXISTS "Invoices can be created by service role" ON invoices;
DROP POLICY IF EXISTS "Invoices can be updated by service role" ON invoices;

-- RLS Policies for invoices table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to invoices"
ON invoices
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view invoices from their organizations
CREATE POLICY "Invoices are viewable by organization members"
ON invoices
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = invoices.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Only service role can create invoices (created via Stripe webhooks)
CREATE POLICY "Invoices can be created by service role"
ON invoices
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only service role can update invoices (updated via Stripe webhooks)
CREATE POLICY "Invoices can be updated by service role"
ON invoices
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Helper function to get invoices for an organization
CREATE OR REPLACE FUNCTION get_organization_invoices(
    p_org_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    stripe_invoice_id TEXT,
    amount_paid NUMERIC(10, 2),
    currency TEXT,
    status invoice_status,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    hosted_invoice_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.stripe_invoice_id,
        i.amount_paid,
        i.currency,
        i.status,
        i.due_date,
        i.paid_at,
        i.hosted_invoice_url,
        i.created_at
    FROM invoices i
    WHERE i.organization_id = p_org_id
    ORDER BY i.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get invoice by stripe invoice ID
CREATE OR REPLACE FUNCTION get_invoice_by_stripe_id(p_stripe_invoice_id TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    subscription_id UUID,
    status invoice_status,
    amount_paid NUMERIC(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.organization_id,
        i.subscription_id,
        i.status,
        i.amount_paid
    FROM invoices i
    WHERE i.stripe_invoice_id = p_stripe_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create or update invoice from Stripe webhook
CREATE OR REPLACE FUNCTION upsert_invoice_from_stripe(
    p_organization_id UUID,
    p_subscription_id UUID,
    p_stripe_invoice_id TEXT,
    p_amount_paid NUMERIC(10, 2),
    p_currency TEXT,
    p_status invoice_status,
    p_invoice_pdf TEXT DEFAULT NULL,
    p_hosted_invoice_url TEXT DEFAULT NULL,
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_paid_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Try to update existing invoice
    UPDATE invoices
    SET
        amount_paid = p_amount_paid,
        currency = p_currency,
        status = p_status,
        invoice_pdf = p_invoice_pdf,
        hosted_invoice_url = p_hosted_invoice_url,
        due_date = p_due_date,
        paid_at = p_paid_at,
        metadata = p_metadata
    WHERE stripe_invoice_id = p_stripe_invoice_id
    RETURNING id INTO v_invoice_id;

    -- If no existing invoice, insert new one
    IF v_invoice_id IS NULL THEN
        INSERT INTO invoices (
            organization_id,
            subscription_id,
            stripe_invoice_id,
            amount_paid,
            currency,
            status,
            invoice_pdf,
            hosted_invoice_url,
            due_date,
            paid_at,
            metadata
        )
        VALUES (
            p_organization_id,
            p_subscription_id,
            p_stripe_invoice_id,
            p_amount_paid,
            p_currency,
            p_status,
            p_invoice_pdf,
            p_hosted_invoice_url,
            p_due_date,
            p_paid_at,
            p_metadata
        )
        RETURNING id INTO v_invoice_id;
    END IF;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Payment history and invoices for subscriptions';
COMMENT ON COLUMN invoices.id IS 'Unique identifier for the invoice';
COMMENT ON COLUMN invoices.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN invoices.subscription_id IS 'Reference to the subscription';
COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID';
COMMENT ON COLUMN invoices.amount_paid IS 'Amount paid in the invoice';
COMMENT ON COLUMN invoices.currency IS 'Currency code (e.g., usd)';
COMMENT ON COLUMN invoices.status IS 'Invoice status: paid, open, void, uncollectible, deleted';
COMMENT ON COLUMN invoices.invoice_pdf IS 'URL to the PDF invoice';
COMMENT ON COLUMN invoices.hosted_invoice_url IS 'URL to the hosted invoice page';
COMMENT ON COLUMN invoices.due_date IS 'Due date for the invoice';
COMMENT ON COLUMN invoices.paid_at IS 'When the invoice was paid';

-- Grant necessary permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoices TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_by_stripe_id TO service_role;
GRANT EXECUTE ON FUNCTION upsert_invoice_from_stripe TO service_role;
