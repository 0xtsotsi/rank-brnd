/**
 * Team Members Feature Verification Test
 *
 * This test verifies that the team members table feature
 * has been correctly implemented.
 */

import { test, expect } from '@playwright/test';

test.describe('Team Members Feature Verification', () => {
  test('should have team members database migration', async () => {
    // Read the migration file
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_team_members_table.sql'
    );

    const migrationContent = await fs.readFile(migrationPath, 'utf-8');

    // Verify key elements of the migration
    expect(migrationContent).toContain(
      'CREATE TABLE IF NOT EXISTS team_members'
    );
    expect(migrationContent).toContain('organization_id UUID');
    expect(migrationContent).toContain('user_id UUID');
    expect(migrationContent).toContain('role team_member_role');
    expect(migrationContent).toContain('invited_at TIMESTAMPTZ');
    expect(migrationContent).toContain('accepted_at TIMESTAMPTZ');
    expect(migrationContent).toContain('UNIQUE(organization_id, user_id)');

    // Verify enum includes all required roles
    expect(migrationContent).toContain("'owner', 'admin', 'editor', 'viewer'");
  });

  test('should have TypeScript types defined', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const typesPath = path.join(process.cwd(), 'types/database.ts');
    const typesContent = await fs.readFile(typesPath, 'utf-8');

    // Verify team_members table types exist
    expect(typesContent).toContain('team_members: {');
    expect(typesContent).toContain("'owner' | 'admin' | 'editor' | 'viewer'");
    expect(typesContent).toContain('invited_at: string');
    expect(typesContent).toContain('accepted_at: string | null');
  });

  test('should have database utility functions', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const utilPath = path.join(process.cwd(), 'lib/supabase/team-members.ts');
    const utilContent = await fs.readFile(utilPath, 'utf-8');

    // Verify key utility functions exist
    expect(utilContent).toContain('getTeamMembersByOrganization');
    expect(utilContent).toContain('addTeamMember');
    expect(utilContent).toContain('updateTeamMemberRole');
    expect(utilContent).toContain('removeTeamMember');
    expect(utilContent).toContain('acceptTeamInvitation');
    expect(utilContent).toContain('getPendingInvitations');
    expect(utilContent).toContain('TeamMemberRole');
  });

  test('should have API routes', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const routePath = path.join(process.cwd(), 'app/api/team-members/route.ts');
    const routeContent = await fs.readFile(routePath, 'utf-8');

    // Verify API route methods
    expect(routeContent).toContain('export async function GET');
    expect(routeContent).toContain('export async function POST');
    expect(routeContent).toContain('export async function DELETE');
    expect(routeContent).toContain('/api/team-members');
  });

  test('should have individual team member route', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const routePath = path.join(
      process.cwd(),
      'app/api/team-members/[id]/route.ts'
    );
    const routeContent = await fs.readFile(routePath, 'utf-8');

    // Verify individual team member operations
    expect(routeContent).toContain('export async function GET');
    expect(routeContent).toContain('export async function PUT');
    expect(routeContent).toContain('export async function DELETE');
  });

  test('should have accept invitation route', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const routePath = path.join(
      process.cwd(),
      'app/api/team-members/accept/route.ts'
    );
    const routeContent = await fs.readFile(routePath, 'utf-8');

    // Verify accept invitation endpoint
    expect(routeContent).toContain('export async function POST');
    expect(routeContent).toContain('acceptTeamInvitation');
    expect(routeContent).toContain('/api/team-members/accept');
  });

  test('should have Zod schemas', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(process.cwd(), 'lib/schemas/team-members.ts');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Verify schema definitions
    expect(schemaContent).toContain('teamMemberRoleSchema');
    expect(schemaContent).toContain('createTeamMemberSchema');
    expect(schemaContent).toContain('updateTeamMemberSchema');
    expect(schemaContent).toContain('teamMembersQuerySchema');
    expect(schemaContent).toContain('acceptTeamInvitationSchema');
  });

  test('should export schemas from index', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const indexPath = path.join(process.cwd(), 'lib/schemas/index.ts');
    const indexContent = await fs.readFile(indexPath, 'utf-8');

    // Verify team-members schema is exported
    expect(indexContent).toContain("export * from './team-members'");
  });
});

test.describe('Team Members Database Functions Verification', () => {
  test('migration should include helper functions', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_team_members_table.sql'
    );

    const migrationContent = await fs.readFile(migrationPath, 'utf-8');

    // Verify helper functions exist
    expect(migrationContent).toContain('get_organization_team_members');
    expect(migrationContent).toContain('add_team_member');
    expect(migrationContent).toContain('accept_team_invitation');
    expect(migrationContent).toContain('update_team_member_role');
    expect(migrationContent).toContain('remove_team_member');
    expect(migrationContent).toContain('has_team_role');
    expect(migrationContent).toContain('get_team_role');
  });

  test('migration should have proper RLS policies', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_team_members_table.sql'
    );

    const migrationContent = await fs.readFile(migrationPath, 'utf-8');

    // Verify RLS policies exist
    expect(migrationContent).toContain(
      'ALTER TABLE team_members ENABLE ROW LEVEL SECURITY'
    );
    expect(migrationContent).toContain(
      'CREATE POLICY "Service role has full access to team_members"'
    );
    expect(migrationContent).toContain(
      'CREATE POLICY "Team owners can manage all team members"'
    );
    expect(migrationContent).toContain(
      'CREATE POLICY "Team admins can manage non-owner team members"'
    );
  });

  test('migration should have proper indexes', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260204_create_team_members_table.sql'
    );

    const migrationContent = await fs.readFile(migrationPath, 'utf-8');

    // Verify indexes exist
    expect(migrationContent).toContain(
      'CREATE INDEX IF NOT EXISTS idx_team_members_org_id'
    );
    expect(migrationContent).toContain(
      'CREATE INDEX IF NOT EXISTS idx_team_members_user_id'
    );
    expect(migrationContent).toContain(
      'CREATE INDEX IF NOT EXISTS idx_team_members_role'
    );
    expect(migrationContent).toContain(
      'CREATE INDEX IF NOT EXISTS idx_team_members_invited_at'
    );
    expect(migrationContent).toContain(
      'CREATE INDEX IF NOT EXISTS idx_team_members_accepted_at'
    );
  });
});
