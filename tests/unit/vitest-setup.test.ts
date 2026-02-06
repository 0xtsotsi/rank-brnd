/**
 * Vitest Setup Verification Test
 *
 * This test verifies that Vitest is correctly configured and working.
 */

import { describe, it, expect, vi } from 'vitest';

describe('Vitest Configuration', () => {
  it('should have access to vitest globals', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
    expect(vi).toBeDefined();
  });

  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toContain('ell');
    expect({ foo: 'bar' }).toEqual({ foo: 'bar' });
  });

  it('should handle async tests', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should support vi mocking', () => {
    const mockFn = vi.fn(() => 42);
    expect(mockFn()).toBe(42);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should support test timeout', { timeout: 5000 }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(true).toBe(true);
  });
});

describe('Test Utilities', () => {
  it('should import test helpers', async () => {
    const { createMockFn, delay, createMockResponse } =
      await import('./vitest-helpers');

    const mock = createMockFn((x: number) => x * 2);
    expect(mock(5)).toBe(10);
    expect(mock).toHaveBeenCalledWith(5);

    await delay(10);
    expect(true).toBe(true);

    const response = createMockResponse({ success: true }, 200);
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });
});
