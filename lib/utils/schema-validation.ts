/**
 * Schema Import Validation Utility
 *
 * Safely checks if properties exist before accessing them
 */

/**
 * Safe property access for objects
 */
export function safeGet<T extends Record<string, any>>(
  obj: T,
  prop: string
): T[keyof T] | undefined {
  if (obj && typeof obj === 'object' && prop in obj) {
    return obj[prop];
  }
  return undefined;
}
