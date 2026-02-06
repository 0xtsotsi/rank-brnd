import { Page, Locator } from '@playwright/test';

/**
 * Common test utilities and helper functions
 */

export class TestHelpers {
  constructor(public readonly page: Page) {}

  /**
   * Wait for network idle (no network requests for specified duration)
   */
  async waitForNetworkIdle(duration = 500): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: duration });
  }

  /**
   * Wait for toast notification to appear and disappear
   */
  async waitForToast(message?: string): Promise<Locator> {
    const toast = this.page.locator('[role="status"], .toast, .notification');
    if (message) {
      await toast.filter({ hasText: message }).waitFor();
      return toast.filter({ hasText: message });
    }
    await toast.first().waitFor();
    return toast.first();
  }

  /**
   * Fill a form with given key-value pairs
   */
  async fillForm(fields: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
      await this.page.fill(selector, value);
    }
  }

  /**
   * Take screenshot on failure
   */
  async screenshotOnFailure(testName: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-screenshots/${testName}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Clear all storage (localStorage, sessionStorage, cookies)
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    const context = this.page.context();
    await context.clearCookies();
  }

  /**
   * Navigate to a page and wait for it to be loaded
   */
  async navigateAndWait(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) || '';
  }

  /**
   * Check if element exists
   */
  async exists(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout = 5000): Promise<void> {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout = 5000): Promise<void> {
    await this.page.locator(selector).waitFor({ state: 'hidden', timeout });
  }

  /**
   * Click element and wait for navigation
   */
  async clickAndWait(selector: string): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.click(selector),
    ]);
  }

  /**
   * Upload a test file
   */
  async uploadFile(
    selector: string,
    fileName: string,
    content: Buffer | string
  ): Promise<void> {
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    await this.page.locator(selector).setInputFiles({
      name: fileName,
      mimeType: this.getMimeType(fileName),
      buffer,
    });
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Mock API response
   */
  async mockApi(endpoint: string, response: any): Promise<void> {
    await this.page.route(endpoint, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock API error
   */
  async mockApiError(endpoint: string, status = 500): Promise<void> {
    await this.page.route(endpoint, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Test error' }),
      });
    });
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for URL to contain path
   */
  async waitForUrl(path: string): Promise<void> {
    await this.page.waitForURL(`**${path}`);
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return this.page.evaluate(fn);
  }

  /**
   * Get value of environment variable from page context
   */
  async getEnvVar(key: string): Promise<string | null> {
    return this.page.evaluate((k) => {
      // @ts-ignore
      return process.env?.[k] || null;
    }, key);
  }
}

/**
 * Create test helpers instance
 */
export function createTestHelpers(page: Page): TestHelpers {
  return new TestHelpers(page);
}

/**
 * Assertive test helpers with built-in expectations
 */
export class AssertiveHelpers extends TestHelpers {
  async assertVisible(selector: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async assertHidden(selector: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async assertText(selector: string, text: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async assertElementCount(selector: string, count: number): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  async assertEnabled(selector: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toBeEnabled();
  }

  async assertDisabled(selector: string): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toBeDisabled();
  }

  async assertAttributeValue(
    selector: string,
    attribute: string,
    value: string
  ): Promise<void> {
    const { expect } = await import('@playwright/test');
    await expect(this.page.locator(selector)).toHaveAttribute(attribute, value);
  }
}

/**
 * Create assertive helpers instance
 */
export function createAssertiveHelpers(page: Page): AssertiveHelpers {
  return new AssertiveHelpers(page);
}
