/**
 * Draft Generation Stage
 *
 * Generates the full article draft based on the outline and SERP analysis.
 * Creates SEO-optimized content with proper structure and tone.
 */

import type { PipelineExecutionContext, PipelineData } from '../types';
import { generateUniqueSlug } from '@/lib/supabase/articles';
import { calculateFleschKincaidGrade } from '@/lib/seo';

/**
 * Tone-specific writing instructions
 */
const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    'Use formal language, industry terminology, and a confident, authoritative voice. Avoid slang and maintain a business-appropriate tone.',
  casual:
    'Use conversational language, contractions, and a relaxed tone. Write as if speaking to a friend while maintaining credibility.',
  friendly:
    'Use warm, approachable language with positive sentiments. Be encouraging and inclusive in your messaging.',
  authoritative:
    'Demonstrate expertise through data, research, and confident assertions. Use precise language and cite sources where applicable.',
  minimalist:
    'Be concise and direct. Eliminate fluff and unnecessary words. Focus on clear, impactful statements.',
  playful:
    'Use humor, wit, and engaging language. Incorporate fun analogies where appropriate.',
};

/**
 * Generate a slug from a title
 */
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 500);
}

/**
 * Generate meta description
 */
function generateMetaDescription(keyword: string, tone: string): string {
  const keywordLower = keyword.toLowerCase();

  const descriptions: Record<string, string> = {
    professional: `Discover comprehensive strategies and expert insights on ${keyword}. Learn proven techniques to achieve optimal results in this detailed guide.`,
    casual: `Want to learn about ${keyword}? We break it down in a way that's actually useful. No fluff, just good info you can use.`,
    friendly: `Explore our friendly guide to ${keyword}! We share helpful tips and insights to make learning easy and enjoyable.`,
    authoritative: `Evidence-based guide to ${keyword} featuring industry research, expert analysis, and proven methodologies for optimal outcomes.`,
    minimalist: `${keyword}: Essential guide covering key concepts and practical applications.`,
    playful: `Dive into the world of ${keyword}! We make learning fun with examples and tips you'll actually remember.`,
  };

  return descriptions[tone] || descriptions.professional;
}

/**
 * Generate meta keywords
 */
function generateMetaKeywords(keyword: string): string[] {
  const baseKeyword = keyword.toLowerCase();
  return [
    baseKeyword,
    baseKeyword.replace(/-/g, ' '),
    `${baseKeyword} guide`,
    `${baseKeyword} tips`,
    `${baseKeyword} strategies`,
    `how to ${baseKeyword}`,
    `${baseKeyword} tutorial`,
  ];
}

/**
 * Generate an engaging title
 */
function generateTitle(
  keyword: string,
  serpData?: PipelineData['serpAnalysis']
): string {
  const templates = [
    `The Ultimate Guide to ${keyword}`,
    `How to Master ${keyword}: A Complete Guide`,
    `${keyword}: Everything You Need to Know`,
    `The Complete ${keyword} Handbook for Beginners`,
    `Top Strategies for ${keyword} in 2025`,
    `Understanding ${keyword}: A Comprehensive Overview`,
    `Your Step-by-Step Guide to ${keyword}`,
    `${keyword} Explained: Expert Tips and Insights`,
  ];

  // Select a template based on keyword hash for consistency
  const index =
    keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    templates.length;
  return templates[index];
}

/**
 * Generate section content
 */
function generateSectionContent(
  section: { title: string; points: string[]; wordCount: number },
  tone: string,
  keyword: string
): string {
  const keywordLower = keyword.toLowerCase();

  // Generate introduction for the section
  let content = `## ${section.title}\n\n`;

  // Add intro paragraph based on tone
  const intros: Record<string, string> = {
    professional: `In this section, we examine ${section.title.toLowerCase()} in detail, providing expert insights and actionable strategies.`,
    casual: `Ready to dive into ${section.title.toLowerCase()}? Let's break it down in a way that actually makes sense.`,
    friendly: `Let's explore ${section.title.toLowerCase()} together in a friendly, easy-to-understand way.`,
    authoritative: `Based on industry research and best practices, ${section.title.toLowerCase()} represents a critical component of success.`,
    minimalist: `${section.title.toLowerCase()} explained simply.`,
    playful: `Alright folks, let's tackle ${section.title.toLowerCase()} — don't worry, it's actually pretty fun!`,
  };

  content += `${intros[tone] || intros.professional}\n\n`;

  // Add content for each point
  for (const point of section.points) {
    content += `### ${point}\n\n`;
    content += `This aspect of ${point.toLowerCase()} is particularly important when considering ${keywordLower}. `;
    content += `By focusing on this area, you can achieve better results and avoid common pitfalls. `;
    content += `Many experts agree that this is a key factor in success.\n\n`;
  }

  return content;
}

/**
 * Generate excerpt from content
 */
function generateExcerpt(content: string, maxLength: number = 200): string {
  // Strip markdown and get first paragraph
  const cleanContent = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\n\n+/g, '\n')
    .trim();

  const firstParagraph = cleanContent.split('\n')[0];

  if (firstParagraph.length <= maxLength) {
    return firstParagraph;
  }

  return firstParagraph.substring(0, maxLength - 3) + '...';
}

/**
 * Execute draft generation stage
 */
export async function executeDraftGeneration(
  context: PipelineExecutionContext,
  data: PipelineData
): Promise<PipelineData> {
  const {
    keyword,
    options,
    providedTitle,
    providedContent,
    supabase,
    organizationId,
  } = context;

  // Check if stage should be skipped
  if (options.skipDraftGeneration) {
    console.log('[Pipeline] Skipping draft generation stage');
    return data;
  }

  // Use provided content if available
  if (providedContent && providedTitle) {
    console.log('[Pipeline] Using provided title and content');

    const slug = await generateUniqueSlug(
      supabase,
      organizationId,
      providedTitle
    );

    return {
      ...data,
      title: providedTitle,
      slug,
      content: providedContent,
      excerpt: generateExcerpt(providedContent),
      metaTitle:
        providedTitle.length > 60
          ? providedTitle.substring(0, 57) + '...'
          : providedTitle,
      metaDescription: generateMetaDescription(
        keyword,
        options.tone || 'professional'
      ),
      metaKeywords: generateMetaKeywords(keyword),
    };
  }

  const tone = options.tone || 'professional';
  const targetWordCount = options.targetWordCount || 1500;

  console.log(
    `[Pipeline] Generating draft with tone: "${tone}", target word count: ${targetWordCount}`
  );

  // Generate title if not provided
  const title = providedTitle || generateTitle(keyword, data.serpAnalysis);
  console.log(`[Pipeline] Generated title: "${title}"`);

  // Generate unique slug
  const slugBase = generateSlugFromTitle(title);
  const slug = await generateUniqueSlug(supabase, organizationId, slugBase);
  console.log(`[Pipeline] Generated slug: "${slug}"`);

  // Generate content from outline
  let content = '';

  if (data.outline && data.outline.length > 0) {
    // Use outline to structure content
    const sections: string[] = [];

    for (const section of data.outline) {
      const sectionContent = generateSectionContent(section, tone, keyword);
      sections.push(sectionContent);
    }

    content = sections.join('\n\n');
  } else {
    // Generate default structure
    content = generateDefaultContent(keyword, tone);
  }

  // Generate meta information
  const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const metaDescription = generateMetaDescription(keyword, tone);
  const metaKeywords = generateMetaKeywords(keyword);
  const excerpt = generateExcerpt(content);

  console.log(
    `[Pipeline] Draft generated with ~${content.split(/\s+/).length} words`
  );

  return {
    ...data,
    title,
    slug,
    content,
    excerpt,
    metaTitle,
    metaDescription,
    metaKeywords,
  };
}

/**
 * Generate default article structure when no outline is provided
 */
function generateDefaultContent(keyword: string, tone: string): string {
  const keywordCapitalized = keyword
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const keywordLower = keyword.toLowerCase();

  const intros: Record<string, string> = {
    professional: `In this comprehensive guide to ${keywordLower}, we'll explore everything you need to know to achieve success.`,
    casual: `Ready to learn about ${keywordLower}? Let's dive in and break it down in a way that actually makes sense.`,
    friendly: `Welcome! We're excited to help you understand ${keywordLower} in this friendly, easy-to-follow guide.`,
    authoritative: `Based on extensive research and industry best practices, this guide examines ${keywordLower} in detail.`,
    minimalist: `${keywordLower}: Essential guide below.`,
    playful: `Hey there! Ready to become an expert on ${keywordLower}? Let's make this fun!`,
  };

  let content = `# ${keywordCapitalized}\n\n`;
  content += `${intros[tone] || intros.professional}\n\n`;
  content += `## What is ${keywordCapitalized}?\n\n`;
  content += `${keywordCapitalized} refers to a critical concept that has gained significant attention in recent years. `;
  content += `At its core, it involves understanding the fundamental principles and applying them effectively in real-world scenarios.\n\n`;
  content += `The importance of ${keywordLower} cannot be overstated. `;
  content += `Organizations and individuals who master this area consistently see better outcomes compared to those who don't.\n\n`;
  content += `## Key Benefits\n\n`;
  content += `When implemented correctly, ${keywordLower} offers numerous advantages:\n\n`;
  content += `- **Improved Efficiency**: Streamlined processes and optimized workflows\n`;
  content += `- **Better Results**: Higher quality outcomes with less wasted effort\n`;
  content += `- **Cost Savings**: Reduced expenses through smarter resource allocation\n`;
  content += `- **Competitive Advantage**: Stay ahead of others in your field\n\n`;
  content += `## How to Get Started\n\n`;
  content += `Ready to implement ${keywordLower}? Follow these steps:\n\n`;
  content += `1. **Assess Your Current Situation**: Understand where you are and where you want to be\n`;
  content += `2. **Set Clear Goals**: Define specific, measurable objectives\n`;
  content += `3. **Create an Action Plan**: Break down your goals into manageable tasks\n`;
  content += `4. **Execute and Monitor**: Implement your plan and track progress\n\n`;
  content += `## Best Practices\n\n`;
  content += `To maximize your success with ${keywordLower}, consider these best practices:\n\n`;
  content += `- Start small and iterate based on results\n`;
  content += `- Measure and track key metrics\n`;
  content += `- Stay informed about industry developments\n`;
  content += `- Seek feedback and continuously improve\n\n`;
  content += `## Common Mistakes to Avoid\n\n`;
  content += `While working with ${keywordLower}, many people encounter these pitfalls:\n\n`;
  content += `- Rushing into implementation without proper planning\n`;
  content += `- Neglecting to measure and track results\n`;
  content += `- Failing to adapt based on feedback and data\n`;
  content += `- Trying to do too much at once instead of iterating gradually\n\n`;
  content += `## Conclusion\n\n`;
  content += `Mastering ${keywordLower} takes time and practice. `;
  content += `Start with the fundamentals, be patient with your progress, and continuously refine your approach based on results. `;
  content += `With consistent effort and the right strategies, you'll achieve your goals.\n`;

  return content;
}
