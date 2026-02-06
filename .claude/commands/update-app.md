---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Dependency Update & Deprecation Fix

## Step 1: Check for Updates

```bash
pnpm outdated
```

Review the output for outdated packages. Pay special attention to:

- Major version updates (may contain breaking changes)
- Packages with security vulnerabilities
- Dependencies that are significantly behind

## Step 2: Update Dependencies

```bash
# Update all dependencies to their latest versions
pnpm update

# Fix security vulnerabilities automatically
pnpm audit --fix
```

If specific packages need major version bumps, update them individually:

```bash
pnpm add package@latest
```

## Step 3: Check for Deprecations & Warnings

Run a fresh installation and capture all output:

```bash
rm -rf node_modules
pnpm install
```

**Read ALL output carefully.** Look for:

- ⚠️ Deprecation warnings (e.g., "XXX is deprecated")
- 🔒 Security vulnerabilities
- ⚡ Peer dependency warnings
- 💥 Breaking changes notices
- 📦 Package resolution issues
- 🔗 Unmet dependencies

## Step 4: Fix Issues

For each warning or deprecation found:

1. **Research the issue**:
   - Check the package's documentation/GitHub issues
   - Look for migration guides
   - Search for the recommended replacement

2. **Apply the fix**:
   - Update to the recommended version
   - Replace deprecated APIs with new ones
   - Update code that uses deprecated features
   - Add missing peer dependencies

3. **Verify the fix**:
   - Re-run `pnpm install`
   - Check that the specific warning is gone
   - Ensure no new warnings appear

4. **Repeat** until ZERO warnings remain

## Step 5: Run Quality Checks

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Format check
pnpm run format:check

# Run tests (if available)
pnpm run test
```

**Fix ALL errors** before completing. The project must pass all quality checks.

## Step 6: Verify Clean Install

Ensure a completely fresh installation works perfectly:

```bash
# Clean everything
rm -rf node_modules .next
pnpm install

# Verify the build works
pnpm run build

# Start dev server briefly to verify
timeout 10 pnpm run dev || true
```

**Success criteria:**

- ✅ ZERO warnings during installation
- ✅ ZERO deprecation notices
- ✅ ZERO security vulnerabilities (or only acceptable ones)
- ✅ All type checks pass
- ✅ All lint checks pass
- ✅ Build completes successfully
- ✅ All dependencies resolve correctly

## Additional Notes for Next.js Projects

- Pay special attention to Next.js version updates - check [Next.js upgrade guides](https://nextjs.org/docs/app/building-your-application/upgrading)
- When upgrading React, review [React changelogs](https://react.dev/blog) for breaking changes
- Tailwind CSS updates may require reviewing your CSS custom properties
- Clerk updates may require reviewing authentication flow changes
- Playwright updates may require reviewing test configurations

## When to Stop

Only complete when:

1. `pnpm install` runs with ZERO output (no warnings, no deprecations)
2. All quality checks pass (typecheck, lint, format)
3. Build succeeds without errors
4. Security audit shows no critical/high vulnerabilities

If you encounter issues you cannot resolve, document them clearly and explain what you tried.
