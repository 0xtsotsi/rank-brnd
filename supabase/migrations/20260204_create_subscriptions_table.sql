-- Migration: Create Subscriptions Table
-- Date: 2026-02-04
-- Description: Creates subscriptions table for Stripe subscription management with organization_id, stripe_customer_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subscription status enum type
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    stripe_product_id TEXT NOT NULL,
    status subscription_status NOT NULL,
    plan_id TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ DEFAULT NULL,
    trial_start TIMESTAMPTZ DEFAULT NULL,
    trial_end TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata ON subscriptions USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions are viewable by organization members" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions can be created by service role" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions can be updated by service role" ON subscriptions;

-- RLS Policies for subscriptions table

-- Policy: Service role has full access (for server-side operations)
CREATE POLICY "Service role has full access to subscriptions"
ON subscriptions
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can view subscriptions from their organizations
CREATE POLICY "Subscriptions are viewable by organization members"
ON subscriptions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = subscriptions.organization_id
        AND organization_members.user_id = auth.uid()::text
    )
);

-- Policy: Only service role can create subscriptions (created via Stripe webhooks)
CREATE POLICY "Subscriptions can be created by service role"
ON subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only service role can update subscriptions (updated via Stripe webhooks)
CREATE POLICY "Subscriptions can be updated by service role"
ON subscriptions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Helper function to get active subscription for an organization
CREATE OR REPLACE FUNCTION get_organization_subscription(p_org_id UUID)
RETURNS TABLE (
    id UUID,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    status subscription_status,
    plan_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    trial_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        s.status,
        s.plan_id,
        s.current_period_start,
        s.current_period_end,
        s.cancel_at_period_end,
        s.trial_end
    FROM subscriptions s
    WHERE s.organization_id = p_org_id
    AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if organization has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE organization_id = p_org_id
        AND status IN ('active', 'trialing')
        AND current_period_end > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get subscription by stripe subscription ID
CREATE OR REPLACE FUNCTION get_subscription_by_stripe_id(p_stripe_subscription_id TEXT)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    status subscription_status,
    plan_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.organization_id,
        s.status,
        s.plan_id
    FROM subscriptions s
    WHERE s.stripe_subscription_id = p_stripe_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create or update subscription from Stripe webhook
CREATE OR REPLACE FUNCTION upsert_subscription_from_stripe(
    p_organization_id UUID,
    p_stripe_subscription_id TEXT,
    p_stripe_customer_id TEXT,
    p_stripe_price_id TEXT,
    p_stripe_product_id TEXT,
    p_status subscription_status,
    p_plan_id TEXT,
    p_current_period_start TIMESTAMPTZ,
    p_current_period_end TIMESTAMPTZ,
    p_cancel_at_period_end BOOLEAN DEFAULT FALSE,
    p_canceled_at TIMESTAMPTZ DEFAULT NULL,
    p_trial_start TIMESTAMPTZ DEFAULT NULL,
    p_trial_end TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Try to update existing subscription
    UPDATE subscriptions
    SET
        stripe_customer_id = p_stripe_customer_id,
        stripe_price_id = p_stripe_price_id,
        stripe_product_id = p_stripe_product_id,
        status = p_status,
        plan_id = p_plan_id,
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = p_cancel_at_period_end,
        canceled_at = p_canceled_at,
        trial_start = p_trial_start,
        trial_end = p_trial_end,
        metadata = p_metadata,
        updated_at = NOW()
    WHERE stripe_subscription_id = p_stripe_subscription_id
    RETURNING id INTO v_subscription_id;

    -- If no existing subscription, insert new one
    IF v_subscription_id IS NULL THEN
        INSERT INTO subscriptions (
            organization_id,
            stripe_subscription_id,
            stripe_customer_id,
            stripe_price_id,
            stripe_product_id,
            status,
            plan_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            canceled_at,
            trial_start,
            trial_end,
            metadata
        )
        VALUES (
            p_organization_id,
            p_stripe_subscription_id,
            p_stripe_customer_id,
            p_stripe_price_id,
            p_stripe_product_id,
            p_status,
            p_plan_id,
            p_current_period_start,
            p_current_period_end,
            p_cancel_at_period_end,
            p_canceled_at,
            p_trial_start,
            p_trial_end,
            p_metadata
        )
        RETURNING id INTO v_subscription_id;
    END IF;

    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE subscriptions IS 'Stripe subscription data for each organization';
COMMENT ON COLUMN subscriptions.id IS 'Unique identifier for the subscription';
COMMENT ON COLUMN subscriptions.organization_id IS 'Reference to the organization';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe price ID for the subscription';
COMMENT ON COLUMN subscriptions.stripe_product_id IS 'Stripe product ID';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, trialing, past_due, canceled, unpaid, incomplete';
COMMENT ON COLUMN subscriptions.plan_id IS 'Plan identifier: free, starter, pro, or agency';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of the current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of the current billing period';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether the subscription will cancel at period end';
COMMENT ON COLUMN subscriptions.canceled_at IS 'When the subscription was canceled';
COMMENT ON COLUMN subscriptions.trial_start IS 'Trial period start timestamp';
COMMENT ON COLUMN subscriptions.trial_end IS 'Trial period end timestamp';
COMMENT ON COLUMN subscriptions.metadata IS 'Additional metadata from Stripe';

-- Grant necessary permissions
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
GRANT EXECUTE ON FUNCTION get_organization_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_by_stripe_id TO service_role;
GRANT EXECUTE ON FUNCTION upsert_subscription_from_stripe TO service_role;
