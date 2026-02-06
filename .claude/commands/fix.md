---
name: fix
description: Run typechecking and linting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

This command runs all linting and typechecking tools for this Next.js TypeScript project, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run the following commands to check for code quality issues:

```bash
# Run ESLint
npm run lint

# Run TypeScript type checking
npm run typecheck

# Check formatting with Prettier
npm run format:check
```

## Step 2: Collect and Parse Errors

Parse the output from the linting and typechecking commands. Group errors by domain:

- **Type errors**: TypeScript compiler errors from `tsc --noEmit`
- **Lint errors**: ESLint issues from `next lint`
- **Format errors**: Prettier formatting issues from `prettier --check`

Create a detailed list of:

- All files with issues
- The specific problems in each file
- The error domain (type/lint/format) for each issue

## Step 3: Spawn Parallel Agents

For each domain that has issues, spawn an agent in parallel using the Task tool:

**IMPORTANT**: Use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

### Example Agent Structure:

1. **Type Fixer Agent** (if type errors exist):
   - Receives list of files with TypeScript errors
   - Fixes all type errors
   - Runs `npm run typecheck` to verify fixes
   - Reports completion

2. **Lint Fixer Agent** (if ESLint errors exist):
   - Receives list of files with ESLint errors
   - Fixes all linting errors
   - Runs `npm run lint` to verify fixes
   - Reports completion

3. **Format Fixer Agent** (if formatting errors exist):
   - Receives list of files with Prettier formatting errors
   - Fixes all formatting errors by running `npm run format`
   - Runs `npm run format:check` to verify fixes
   - Reports completion

## Step 4: Verify All Fixes

After all agents complete, run the full check suite again to ensure all issues are resolved:

```bash
npm run lint && npm run typecheck && npm run format:check
```

If any issues remain, repeat Steps 2-4 until all checks pass.
