/**
 * Validation Helper Functions
 *
 * Provides consistent validation error responses across all API routes.
 */

import { z } from 'zod';
import type { ZodError, ZodSchema } from 'zod';

/**
 * Validation result type
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    error: string;
    details: Record<string, string | string[] | undefined>;
  };
}

/**
 * Validates request body against a Zod schema
 *
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns ValidationResult with either data or error details
 *
 * @example
 * const body = await req.json();
 * const result = validateRequest(body, createCheckoutSessionSchema);
 * if (!result.success) {
 *   return NextResponse.json(result.error, { status: 400 });
 * }
 * // Use result.data
 */
export function validateRequest<T extends ZodSchema>(
  body: unknown,
  schema: T
): ValidationResult<z.infer<T>> {
  const validationResult = schema.safeParse(body);

  if (!validationResult.success) {
    return {
      success: false,
      error: {
        error: 'Validation failed',
        details: formatZodError(validationResult.error),
      },
    };
  }

  return {
    success: true,
    data: validationResult.data,
  };
}

/**
 * Validates query parameters against a Zod schema
 *
 * @param searchParams - URLSearchParams from the request
 * @param schema - The Zod schema to validate against
 * @returns ValidationResult with either data or error details
 *
 * @example
 * const result = validateQueryParams(req.nextUrl.searchParams, pricesQuerySchema);
 * if (!result.success) {
 *   return NextResponse.json(result.error, { status: 400 });
 * }
 */
export function validateQueryParams<T extends ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): ValidationResult<z.infer<T>> {
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    // If key already exists, convert to array
    if (key in params) {
      const existing = params[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    } else {
      params[key] = value;
    }
  }

  return validateRequest(params, schema);
}

/**
 * Formats Zod error into a more user-friendly structure
 *
 * @param error - The ZodError to format
 * @returns Object with field names as keys and error messages as values
 */
export function formatZodError(
  error: ZodError
): Record<string, string | string[] | undefined> {
  const flattened = error.flatten();
  const fieldErrors: Record<string, string | string[] | undefined> = {};

  for (const [field, issues] of Object.entries(flattened.fieldErrors)) {
    const issueList = issues as { message: string }[];
    if (issueList && issueList.length > 0) {
      // If there's only one issue, return it as a string
      // If there are multiple issues, return them as an array
      fieldErrors[field] =
        issueList.length === 1
          ? issueList[0].message
          : issueList.map((i) => i.message);
    }
  }

  // Add form-level errors if any
  if (flattened.formErrors.length > 0) {
    fieldErrors._form =
      flattened.formErrors.length === 1
        ? flattened.formErrors[0]
        : flattened.formErrors;
  }

  return fieldErrors;
}

/**
 * Creates a validation response for Next.js routes
 *
 * @param validationResult - The result from validateRequest or validateQueryParams
 * @returns A NextResponse JSON object with appropriate status code
 */
export function createValidationErrorResponse(
  validationResult: ValidationResult
): Response {
  return new Response(JSON.stringify(validationResult.error), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Helper to validate and return early if invalid
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const body = await req.json();
 *   const data = await validateOrThrow(body, mySchema);
 *   // Use data safely
 * }
 */
export async function validateOrThrow<T extends ZodSchema>(
  body: unknown,
  schema: T
): Promise<z.infer<T>> {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = new ValidationException('Validation failed', result.error);
    throw error;
  }

  return result.data;
}

/**
 * Custom exception for validation errors
 */
export class ValidationException extends Error {
  public readonly details: Record<string, string | string[] | undefined>;
  public readonly statusCode = 400;

  constructor(
    message: string,
    public readonly zodError: ZodError
  ) {
    super(message);
    this.name = 'ValidationException';
    this.details = formatZodError(zodError);
  }
}

/**
 * Schema for paginated query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  cursor: z.string().optional(),
});

/**
 * Schema for sort parameters
 */
export const sortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Schema for search/filter parameters
 */
export const filterSchema = z.object({
  search: z.string().optional(),
  query: z.string().optional(),
});
