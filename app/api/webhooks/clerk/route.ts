// @ts-nocheck - Database types need to be regenerated with Supabase CLI

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/client';

/**
 * Clerk Webhook Handler
 *
 * This endpoint receives webhook events from Clerk to sync user data
 * to our local database. This is essential for:
 * - Maintaining user profiles in our database
 * - Handling organization membership changes
 * - Syncing role updates from Clerk
 *
 * Security:
 * - All webhooks are signed with Clerk's webhook secret
 * - We verify the signature before processing any events
 *
 * Setup:
 * 1. Get webhook secret from Clerk Dashboard -> Webhooks -> Add Endpoint
 * 2. Add CLERK_WEBHOOK_SECRET to .env
 * 3. Configure webhook URL: https://your-domain.com/api/webhooks/clerk
 */

/**
 * Get webhook secret at runtime (not build time)
 * This allows the build to succeed without the environment variable
 */
function getWebhookSecret(): string {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('CLERK_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

type WebhookEvent = {
  data: Record<string, any>;
  object: 'event';
  type: string;
};

/**
 * Handle Clerk webhook events
 */
export async function POST(req: NextRequest) {
  // Get headers
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  // Verify required headers
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Error: Missing svix headers', { status: 400 });
  }

  // Get raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create webhook instance and verify signature
  const wh = new Webhook(getWebhookSecret());
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error: Invalid signature', { status: 403 });
  }

  // Handle the webhook event
  const { type, data } = evt;

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;

      case 'user.updated':
        await handleUserUpdated(data);
        break;

      case 'user.deleted':
        await handleUserDeleted(data);
        break;

      case 'organization.created':
        await handleOrganizationCreated(data);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(data);
        break;

      case 'organization.deleted':
        await handleOrganizationDeleted(data);
        break;

      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(data);
        break;

      case 'organizationMembership.updated':
        await handleOrganizationMembershipUpdated(data);
        break;

      case 'organizationMembership.deleted':
        await handleOrganizationMembershipDeleted(data);
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}

/**
 * Handle user creation
 *
 * Syncs the newly created Clerk user to our Supabase database.
 * This ensures we have a local user record for organization membership.
 */
async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, username } =
    data;
  const primaryEmail = email_addresses.find(
    (e: any) => e.id === data.primary_email_address_id
  )?.email_address;

  console.log('User created:', {
    clerkId: id,
    email: primaryEmail,
    name: `${first_name} ${last_name}`.trim() || username || 'User',
    imageUrl: image_url,
  });

  // Sync user to Supabase database
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from('users').insert({
    clerk_id: id,
    email: primaryEmail || '',
    name: `${first_name || ''} ${last_name || ''}`.trim() || username || 'User',
    avatar_url: image_url || null,
    role: 'member', // Default role, will be updated when joining an org
    is_active: true,
    last_login: new Date().toISOString(),
  });

  if (error) {
    console.error('Error inserting user to database:', error);
    // Don't throw - we don't want to fail the webhook
  }
}

/**
 * Handle user update
 *
 * Syncs user profile updates from Clerk to our Supabase database.
 */
async function handleUserUpdated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, username } =
    data;
  const primaryEmail = email_addresses.find(
    (e: any) => e.id === data.primary_email_address_id
  )?.email_address;

  console.log('User updated:', {
    clerkId: id,
    email: primaryEmail,
    name: `${first_name} ${last_name}`.trim() || username || 'User',
    imageUrl: image_url,
  });

  // Sync user updates to Supabase database
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('users')
    .update({
      email: primaryEmail || '',
      name:
        `${first_name || ''} ${last_name || ''}`.trim() || username || 'User',
      avatar_url: image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', id);

  if (error) {
    console.error('Error updating user in database:', error);
    // Don't throw - we don't want to fail the webhook
  }
}

/**
 * Handle user deletion
 */
async function handleUserDeleted(data: any) {
  const { id } = data;

  console.log('User deleted:', { clerkId: id });
}

/**
 * Handle organization creation
 */
async function handleOrganizationCreated(data: any) {
  const { id, name, slug, image_url, created_by } = data;

  console.log('Organization created:', {
    clerkId: id,
    name,
    slug,
    imageUrl: image_url,
    createdBy: created_by,
  });

  // TODO: Insert organization into database when Drizzle is set up
}

/**
 * Handle organization update
 */
async function handleOrganizationUpdated(data: any) {
  const { id, name, slug, image_url } = data;

  console.log('Organization updated:', {
    clerkId: id,
    name,
    slug,
    imageUrl: image_url,
  });

  // TODO: Update organization in database when Drizzle is set up
}

/**
 * Handle organization deletion
 */
async function handleOrganizationDeleted(data: any) {
  const { id } = data;

  console.log('Organization deleted:', { clerkId: id });
}

/**
 * Handle organization membership creation
 */
async function handleOrganizationMembershipCreated(data: any) {
  const { id, organization, public_user_id, role } = data;

  console.log('Organization membership created:', {
    clerkId: id,
    organizationId: organization.id,
    userId: public_user_id,
    role,
  });

  // TODO: Insert membership into database when Drizzle is set up
}

/**
 * Handle organization membership update
 */
async function handleOrganizationMembershipUpdated(data: any) {
  const { id, role } = data;

  console.log('Organization membership updated:', {
    clerkId: id,
    role,
  });

  // TODO: Update membership in database when Drizzle is set up
}

/**
 * Handle organization membership deletion
 */
async function handleOrganizationMembershipDeleted(data: any) {
  const { id } = data;

  console.log('Organization membership deleted:', { clerkId: id });

  // TODO: Delete or archive membership in database when Drizzle is set up
}
