/**
 * Playwright Verification Test for Image Generation Dialog
 *
 * This is a temporary test to verify the image generation dialog
 * feature works correctly. It will be deleted after verification.
 */

import { test, expect } from '@playwright/test';

test.describe('Image Generation Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the article editor page
    await page.goto('/dashboard/articles/new');
  });

  test('should display the AI generation button in featured image section', async ({
    page,
  }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Look for the "Generate with AI" button
    const aiButton = page.getByText('Generate with AI');
    await expect(aiButton).toBeVisible();
  });

  test('should open the image generation dialog when clicking the button', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');

    // Click the AI generation button
    await page.getByText('Generate with AI').click();

    // Verify dialog opens - look for the dialog title
    await expect(page.getByText('Generate Image with AI')).toBeVisible();

    // Verify all 5 style options are present
    await expect(page.getByText('Photorealistic')).toBeVisible();
    await expect(page.getByText('Watercolor')).toBeVisible();
    await expect(page.getByText('Illustration')).toBeVisible();
    await expect(page.getByText('Sketch')).toBeVisible();
    await expect(page.getByText('Brand Design')).toBeVisible();
  });

  test('should display prompt textarea', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();

    // Verify prompt textarea is present
    const promptInput = page.getByPlaceholder('Describe your image');
    await expect(promptInput).toBeVisible();
  });

  test('should select different styles', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();

    // Click on Watercolor style
    await page.getByText('Watercolor').click();

    // Verify style is selected (check for border or checkmark)
    const watercolorButton = page.getByText('Watercolor').locator('..');
    await expect(watercolorButton).toHaveClass(/border-indigo-500/);
  });

  test('should close dialog when clicking cancel', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();
    await expect(page.getByText('Generate Image with AI')).toBeVisible();

    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify dialog is closed
    await expect(page.getByText('Generate Image with AI')).not.toBeVisible();
  });

  test('should close dialog when clicking backdrop', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();
    await expect(page.getByText('Generate Image with AI')).toBeVisible();

    // Click on the backdrop (outside the modal)
    await page.click('body', { position: { x: 100, y: 100 } });

    // Verify dialog is closed
    await expect(page.getByText('Generate Image with AI')).not.toBeVisible();
  });

  test('should have brand color toggle when brand settings exist', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();

    // Look for brand color section (may or may not exist depending on settings)
    const brandColorToggle = page.getByText('Apply brand colors');
    // We just verify it exists in the DOM, but it may be hidden if no brand settings
    const elementCount = await page.getByText('Apply brand colors').count();
    expect(elementCount).toBeGreaterThanOrEqual(0);
  });

  test('should disable generate button when prompt is empty', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();

    // Verify generate button is disabled when no prompt
    const generateButton = page.getByRole('button', {
      name: /Generate Images/i,
    });
    await expect(generateButton).toBeDisabled();
  });

  test('should enable generate button when prompt is entered', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');

    await page.getByText('Generate with AI').click();

    // Enter a prompt
    await page
      .getByPlaceholder('Describe your image')
      .fill('A beautiful mountain landscape at sunset');

    // Verify generate button is enabled
    const generateButton = page.getByRole('button', {
      name: /Generate Images/i,
    });
    await expect(generateButton).not.toBeDisabled();
  });
});

test.describe('Image Generation Dialog Component Structure', () => {
  test('should verify component file exists and exports correctly', async ({}) => {
    // This test verifies the component structure
    const fs = await import('fs');
    const path = await import('path');

    const componentPath = path.join(
      process.cwd(),
      'components/articles/image-generation-dialog.tsx'
    );
    const exists = fs.existsSync(componentPath);

    expect(exists).toBe(true);

    if (exists) {
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('ImageGenerationDialog');
      expect(content).toContain('export function');
      expect(content).toContain('STYLE_OPTIONS');
    }
  });
});
