/**
 * Outline Generation Stage
 *
 * Generates an article outline based on the keyword and SERP analysis.
 * Creates a structure optimized for SEO and reader engagement.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';
import { classifyContentType } from '@/lib/serpapi';

/**
 * Detect article type from keyword and SERP data
 */
function detectArticleType(
  keyword: string,
  serpData?: PipelineData['serpAnalysis']
): string {
  const keywordLower = keyword.toLowerCase();

  // How-to detection
  if (keywordLower.startsWith('how to') || keywordLower.startsWith('how ')) {
    return 'howTo';
  }

  // Comparison detection
  if (keywordLower.includes(' vs ') || keywordLower.includes(' versus ')) {
    return 'comparison';
  }

  // List/best of detection
  if (
    keywordLower.includes('best ') ||
    keywordLower.startsWith('top ') ||
    keywordLower.includes(' tips') ||
    keywordLower.includes(' mistakes')
  ) {
    return 'list';
  }

  // Guide/tutorial detection
  if (
    keywordLower.includes('guide') ||
    keywordLower.includes('tutorial') ||
    keywordLower.includes('learn')
  ) {
    return 'guide';
  }

  // Default to comprehensive guide
  return 'guide';
}

/**
 * Generate outline sections based on article type and keyword
 */
function generateOutlineSections(
  keyword: string,
  articleType: string,
  sectionCount: number,
  serpData?: PipelineData['serpAnalysis']
): Array<{
  id: string;
  title: string;
  points: string[];
  wordCount: number;
}> {
  const outline: Array<{
    id: string;
    title: string;
    points: string[];
    wordCount: number;
  }> = [];

  const capitalizeKeyword = (k: string) =>
    k
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const keywordCapitalized = capitalizeKeyword(keyword);
  const keywordLower = keyword.toLowerCase();

  // Always add introduction
  outline.push({
    id: 'intro',
    title: `Introduction to ${keywordCapitalized}`,
    points: [
      `Understanding the importance of ${keywordLower}`,
      `What readers will learn from this article`,
      `Why ${keywordLower} matters in today's context`,
    ],
    wordCount: 150,
  });

  // Generate middle sections based on article type
  const middleSectionCount = sectionCount - 2; // Account for intro and conclusion

  switch (articleType) {
    case 'howTo':
      outline.push(
        {
          id: 'prerequisites',
          title: 'Understanding the Basics',
          points: [
            `Key concepts related to ${keywordLower}`,
            `What you need to know before starting`,
            `Common misconceptions`,
          ],
          wordCount: 200,
        },
        {
          id: 'steps',
          title: 'Step-by-Step Process',
          points: [
            `Initial preparation for ${keywordLower}`,
            `Core steps to follow`,
            `Best practices for execution`,
            `Tips for better results`,
          ],
          wordCount: 400,
        },
        {
          id: 'troubleshooting',
          title: 'Common Challenges and Solutions',
          points: [
            'Typical obstacles you might encounter',
            'How to overcome common issues',
            'When to seek additional help',
          ],
          wordCount: 200,
        }
      );
      break;

    case 'comparison':
      outline.push(
        {
          id: 'overview',
          title: 'Key Differences at a Glance',
          points: [
            'Main comparison points',
            'Quick reference table',
            'Understanding the core distinctions',
          ],
          wordCount: 200,
        },
        {
          id: 'detailed-comparison',
          title: 'Detailed Feature Comparison',
          points: [
            'In-depth analysis of each aspect',
            'Pros and cons breakdown',
            'Use case scenarios',
          ],
          wordCount: 350,
        },
        {
          id: 'verdict',
          title: 'Which Should You Choose?',
          points: [
            'Recommendations based on needs',
            'Decision-making framework',
            'Final considerations',
          ],
          wordCount: 200,
        }
      );
      break;

    case 'list':
      outline.push(
        {
          id: 'main-list',
          title: `Essential ${keywordCapitalized} Strategies`,
          points: [
            'Strategy 1 with implementation tips',
            'Strategy 2 with examples',
            'Strategy 3 for immediate results',
            'Strategy 4 for long-term success',
            'Strategy 5 for advanced users',
          ],
          wordCount: 400,
        },
        {
          id: 'implementation',
          title: 'Implementation Tips',
          points: [
            'How to apply these strategies',
            'Common pitfalls to avoid',
            'Measuring success',
          ],
          wordCount: 200,
        }
      );
      break;

    case 'guide':
    default:
      outline.push(
        {
          id: 'what-is',
          title: `What is ${keywordCapitalized}?`,
          points: [
            `Definition and overview of ${keywordLower}`,
            'Core components and elements',
            'Why it matters',
          ],
          wordCount: 200,
        },
        {
          id: 'benefits',
          title: `Key Benefits of ${keywordCapitalized}`,
          points: [
            'Primary advantages',
            'Secondary benefits',
            'Return on investment',
          ],
          wordCount: 200,
        },
        {
          id: 'implementation',
          title: 'How to Get Started',
          points: [
            'Initial steps to take',
            'Resources and tools needed',
            'Building a foundation',
          ],
          wordCount: 250,
        },
        {
          id: 'best-practices',
          title: 'Best Practices and Tips',
          points: [
            'Expert recommendations',
            'Common mistakes to avoid',
            'Optimization strategies',
          ],
          wordCount: 200,
        }
      );
      break;
  }

  // Always add conclusion
  outline.push({
    id: 'conclusion',
    title: 'Conclusion and Next Steps',
    points: [
      `Key takeaways about ${keywordLower}`,
      'Action items for immediate implementation',
      'Resources for further learning',
    ],
    wordCount: 150,
  });

  // Truncate or extend to match requested section count
  if (outline.length > sectionCount) {
    return outline.slice(0, sectionCount);
  }

  return outline;
}

/**
 * Execute outline generation stage
 */
export async function executeOutlineGeneration(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const { keyword, options, providedOutline } = context;

  // Check if stage should be skipped
  if (options.skipOutlineGeneration) {
    console.log('[Pipeline] Skipping outline generation stage');
    return data;
  }

  // Use provided outline if available
  if (providedOutline && providedOutline.length > 0) {
    console.log('[Pipeline] Using provided outline');
    return {
      ...data,
      outline: providedOutline,
    };
  }

  // Detect article type
  const articleType = detectArticleType(keyword, data.serpAnalysis);
  console.log(`[Pipeline] Detected article type: "${articleType}"`);

  // Generate outline
  const sectionCount = options.outlineSections || 6;
  const outline = generateOutlineSections(
    keyword,
    articleType,
    sectionCount,
    data.serpAnalysis
  );

  console.log(`[Pipeline] Generated outline with ${outline.length} sections`);

  return {
    ...data,
    outline,
  };
}
