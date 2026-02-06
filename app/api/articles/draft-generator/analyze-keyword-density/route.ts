/**
 * Keyword Density Analysis API Route
 *
 * POST /api/articles/draft-generator/analyze-keyword-density - Analyze keyword density
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { analyzeKeywordDensity } from '@/lib/article-draft-generator';
import {
  analyzeKeywordDensitySchema,
  validateRequest,
  type ValidationResult,
} from '@/lib/schemas';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult: ValidationResult = validateRequest(
      body,
      analyzeKeywordDensitySchema
    );

    if (!validationResult.success || !validationResult.data) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const { content, keyword } = validationResult.data;

    // Analyze keyword density
    const result = analyzeKeywordDensity(content, keyword);

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        density: result.density,
        density_percent: result.density * 100,
        count: result.count,
        total_words: result.totalWords,
        in_range: result.inRange,
        recommendations: result.recommendations,
      },
    });
  } catch (error) {
    console.error('Keyword density analysis error:', error);

    return NextResponse.json(
      { error: 'Failed to analyze keyword density' },
      { status: 500 }
    );
  }
}
