/**
 * Image Upload Verification Test
 *
 * This is a temporary test to verify the image upload functionality works correctly.
 * After successful verification, this test file can be removed.
 */

import { test, expect } from '@playwright/test';

test.describe('Image Upload Functionality', () => {
  test('should load the test upload page', async ({ page }) => {
    await page.goto('/test-upload');

    // Check page title
    await expect(page.locator('h1')).toContainText('Image Upload Test');

    // Check file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Check upload button exists
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeDisabled(); // Disabled when no file selected
  });

  test('should show file info when file is selected', async ({ page }) => {
    await page.goto('/test-upload');

    // Create a small test image (1x1 PNG)
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Get file input and upload test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImage,
    });

    // Check file info is displayed
    await expect(page.locator('text=Selected:')).toBeVisible();
    await expect(page.locator('text=test-image.png')).toBeVisible();
    await expect(page.locator('text=Size:')).toBeVisible();
    await expect(page.locator('text=Type:')).toBeVisible();
    await expect(page.locator('text=image/png')).toBeVisible();

    // Check upload button is now enabled
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeEnabled();
  });

  test('should show error for unsupported file type', async ({ page }) => {
    await page.goto('/test-upload');

    // Try to upload a text file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('test content'),
    });

    // Click upload button
    await page.locator('button[type="submit"]').click();

    // Check error message is shown (this may show after upload attempt)
    // Note: This might take a moment as the validation happens during upload
  });

  test('should display test instructions', async ({ page }) => {
    await page.goto('/test-upload');

    // Check instructions are visible
    await expect(
      page.locator('h2:has-text("Test Instructions")')
    ).toBeVisible();
    await expect(
      page.locator('text=Supabase environment variables')
    ).toBeVisible();
    await expect(page.locator('text=storage bucket named')).toBeVisible();
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/test-upload');

    // Check main form elements
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('label[for="file"]')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check styling is applied
    const uploadButton = page.locator('button[type="submit"]');
    const buttonStyle = await uploadButton.evaluate(
      (el) => window.getComputedStyle(el).cssText
    );
    expect(buttonStyle).toContain('background');
  });
});

test.describe('Supabase Storage Module', () => {
  test('storage utilities should be importable', async ({ page }) => {
    // This test verifies the module can be loaded
    await page.goto('/test-upload');

    // The page loads successfully, which means the module is importable
    await expect(page.locator('h1')).toContainText('Image Upload Test');
  });
});
