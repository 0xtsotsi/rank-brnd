/**
 * Article Outline Generator API Route
 * Generates article outlines based on keywords and SEO best practices
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

/**
 * Schema for outline generation request
 */
const generateOutlineSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required'),
  organization_id: z.string().optional(),
  keyword_id: z.string().optional(),
  sections: z.number().int().min(3).max(10).optional().default(5),
  target_length: z.number().optional(),
});

/**
 * POST /api/articles/outline
 * Generate an article outline based on the provided keyword
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = generateOutlineSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const outline = await generateOutline(data);

    return NextResponse.json({ outline }, { status: 200 });
  } catch (error) {
    console.error('Error generating outline:', error);
    return NextResponse.json(
      { error: 'Failed to generate outline' },
      { status: 500 }
    );
  }
}

/**
 * Generate article outline using AI
 *
 * In production, this would call an AI service like OpenAI's GPT-4.
 * For now, it returns a structured outline based on the keyword.
 */
async function generateOutline(data: z.infer<typeof generateOutlineSchema>) {
  const { keyword, sections = 5 } = data;

  // Generate a comprehensive outline based on the keyword
  const outline: Array<{
    id: string;
    title: string;
    points: string[];
    wordCount: number;
  }> = [];

  // Add introduction section
  outline.push({
    id: 'intro',
    title: `Introduction to ${capitalizeKeyword(keyword)}`,
    points: [
      `Define what ${keyword.toLowerCase()} means in the current context`,
      `Explain why ${keyword.toLowerCase()} matters for your audience`,
      `Provide a brief overview of what readers will learn`,
      `Set expectations for the rest of the article`,
    ],
    wordCount: 150,
  });

  // Generate middle sections based on keyword type
  const middleSections = generateMiddleSections(keyword, sections - 2);
  outline.push(...middleSections);

  // Add conclusion section
  outline.push({
    id: 'conclusion',
    title: 'Conclusion and Next Steps',
    points: [
      `Summarize the key points about ${keyword.toLowerCase()}`,
      `Provide actionable takeaways for immediate implementation`,
      `Suggest resources for further learning`,
      `Include a call-to-action or engagement prompt`,
    ],
    wordCount: 150,
  });

  return outline;
}

/**
 * Generate middle sections of the outline based on keyword analysis
 */
function generateMiddleSections(keyword: string, count: number) {
  const keywordLower = keyword.toLowerCase();

  // Define section templates for different article types
  const templates: Record<
    string,
    Array<{ title: string; points: string[] }>
  > = {
    // How-to articles
    howTo: [
      {
        title: 'Understanding the Basics',
        points: [
          `Key concepts and terminology related to ${keywordLower}`,
          'Prerequisites and requirements',
          'Common misconceptions debunked',
        ],
      },
      {
        title: 'Step-by-Step Implementation',
        points: [
          `Initial setup for ${keywordLower}`,
          'Core processes and workflows',
          'Best practices for execution',
        ],
      },
      {
        title: 'Advanced Techniques',
        points: [
          `Optimizing ${keywordLower} for better results`,
          'Pro tips from industry experts',
          'Automation and efficiency strategies',
        ],
      },
      {
        title: 'Troubleshooting Common Issues',
        points: [
          'Identifying frequent problems',
          'Practical solutions and workarounds',
          'When to seek professional help',
        ],
      },
      {
        title: 'Real-World Examples',
        points: [
          `Case studies: ${keywordLower} in action`,
          'Success stories and lessons learned',
          'Industry applications and variations',
        ],
      },
    ],

    // Guide/articles
    guide: [
      {
        title: 'Why This Matters Now',
        points: [
          `Current trends in ${keywordLower}`,
          'Industry shifts and developments',
          'Future outlook and predictions',
        ],
      },
      {
        title: 'Core Components',
        points: [
          `Essential elements of ${keywordLower}`,
          'How components interact',
          'Critical success factors',
        ],
      },
      {
        title: 'Implementation Strategies',
        points: [
          `Getting started with ${keywordLower}`,
          'Phased rollout approach',
          'Resource allocation and planning',
        ],
      },
      {
        title: 'Measuring Success',
        points: [
          'Key performance indicators',
          'Benchmarking and goal setting',
          'Tools for tracking progress',
        ],
      },
      {
        title: 'Expert Recommendations',
        points: [
          'Insights from industry leaders',
          `Proven strategies for ${keywordLower}`,
          'Emerging opportunities',
        ],
      },
    ],

    // Comparison/review articles
    comparison: [
      {
        title: 'Key Features and Characteristics',
        points: [
          `Defining features of ${keywordLower}`,
          'Comparison criteria and metrics',
          'What sets it apart',
        ],
      },
      {
        title: 'Pros and Cons',
        points: [
          `Advantages of ${keywordLower}`,
          'Potential drawbacks and limitations',
          'Best use cases identified',
        ],
      },
      {
        title: 'Performance Analysis',
        points: [
          'Benchmark comparisons',
          'Real-world performance data',
          'Cost-benefit analysis',
        ],
      },
      {
        title: 'User Experience',
        points: [
          'Ease of use and accessibility',
          'Learning curve considerations',
          'Support and resources available',
        ],
      },
      {
        title: 'Verdict and Recommendations',
        points: [
          'Who should use this',
          `Ideal scenarios for ${keywordLower}`,
          'Final assessment',
        ],
      },
    ],

    // List/best practices articles
    list: [
      {
        title: 'Essential Best Practices',
        points: [
          `Top strategies for ${keywordLower}`,
          'Industry-standard approaches',
          'What experts recommend',
        ],
      },
      {
        title: 'Common Pitfalls to Avoid',
        points: [
          'Frequent mistakes made',
          `Why ${keywordLower} projects fail`,
          'Warning signs and red flags',
        ],
      },
      {
        title: 'Tools and Resources',
        points: [
          `Recommended tools for ${keywordLower}`,
          'Free and paid options',
          'Integration possibilities',
        ],
      },
      {
        title: 'Tips from the Pros',
        points: [
          'Expert insights and quotes',
          'Behind-the-scenes knowledge',
          'Industry secrets revealed',
        ],
      },
      {
        title: 'Quick Wins',
        points: [
          'Immediate improvements possible',
          'Low-hanging fruit opportunities',
          'Fast-track strategies',
        ],
      },
    ],
  };

  // Determine article type based on keyword
  let articleType = 'guide';

  if (keywordLower.startsWith('how to') || keywordLower.startsWith('how')) {
    articleType = 'howTo';
  } else if (
    keywordLower.includes('best') ||
    keywordLower.includes('top') ||
    keywordLower.includes('vs') ||
    keywordLower.includes('review')
  ) {
    articleType = 'comparison';
  } else if (
    keywordLower.includes('tips') ||
    keywordLower.includes('tricks') ||
    keywordLower.includes('mistakes') ||
    keywordLower.includes('practices')
  ) {
    articleType = 'list';
  }

  // Get sections for the determined type
  const sections = templates[articleType] || templates.guide;

  // Return the requested number of sections
  return sections.slice(0, Math.min(count, sections.length)).map((section) => ({
    id: generateId(),
    title: section.title,
    points: section.points,
    wordCount: 200,
  }));
}

/**
 * Capitalize the first letter of each word in the keyword
 */
function capitalizeKeyword(keyword: string): string {
  return keyword
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a unique ID for outline sections
 */
function generateId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
