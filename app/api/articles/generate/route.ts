/**
 * Article Generation API Route
 * Handles AI-powered article generation based on keywords, outlines, and brand voice
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

/**
 * Schema for article generation request
 */
const generateArticleSchema = z.object({
  keyword_id: z.string().optional(),
  keyword: z.string().min(1, 'Keyword is required'),
  outline: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        points: z.array(z.string()),
        wordCount: z.number(),
      })
    )
    .optional(),
  tone: z
    .enum([
      'professional',
      'casual',
      'friendly',
      'authoritative',
      'minimalist',
      'playful',
    ])
    .default('professional'),
  customInstructions: z.string().optional(),
  targetLength: z.number().int().positive().default(1000),
  organization_id: z.string().optional(),
});

/**
 * Tone-specific writing instructions
 */
const toneInstructions: Record<string, string> = {
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
    'Use humor, wit, and engaging language. Incorporate pop culture references and fun analogies where appropriate.',
};

/**
 * POST /api/articles/generate
 * Generate an article based on keyword, outline, and brand voice
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = generateArticleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate the article using AI
    const article = await generateArticleWithAI(data);

    return NextResponse.json({ article }, { status: 200 });
  } catch (error) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article' },
      { status: 500 }
    );
  }
}

/**
 * Generate article content using AI
 *
 * In production, this would call an AI service like OpenAI's GPT-4.
 * For now, it returns a structured template based on the inputs.
 */
async function generateArticleWithAI(
  data: z.infer<typeof generateArticleSchema>
) {
  const { keyword, outline, tone, customInstructions, targetLength } = data;

  // Build the system prompt based on tone and custom instructions
  const toneInstruction =
    toneInstructions[tone] || toneInstructions.professional;
  const systemPrompt = `${toneInstruction}${customInstructions ? ` Additional requirements: ${customInstructions}` : ''}`;

  // Generate title based on keyword
  const title = generateTitle(keyword);

  // Generate slug
  const slug = generateSlug(title);

  // Generate content based on outline or create a default structure
  let content: string;
  let sections: string[];

  if (outline && outline.length > 0) {
    sections = outline.map((section) =>
      generateSection(section.title, section.points, tone)
    );
  } else {
    sections = generateDefaultSections(keyword, tone);
  }

  content = sections.join('\n\n');

  // Generate meta information
  const metaTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const metaDescription = generateMetaDescription(keyword, tone);
  const metaKeywords = generateMetaKeywords(keyword);

  // Generate excerpt
  const excerpt =
    content.length > 200 ? content.substring(0, 197) + '...' : content;

  return {
    title,
    slug,
    content,
    excerpt,
    metaTitle,
    metaDescription,
    metaKeywords,
    tone,
    targetLength,
    keyword,
    systemPrompt,
  };
}

/**
 * Generate an engaging title based on the keyword
 */
function generateTitle(keyword: string): string {
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
 * Generate a URL-friendly slug from the title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 500);
}

/**
 * Generate a section of content based on title and bullet points
 */
function generateSection(
  title: string,
  points: string[],
  tone: string
): string {
  const intro = generateIntro(title, tone);
  const pointsContent = points
    .map((point) => `## ${point}\n\n${generateParagraphForPoint(point, tone)}`)
    .join('\n\n');
  const conclusion = generateConclusion(title, tone);

  return `## ${title}\n\n${intro}\n\n${pointsContent}\n\n${conclusion}`;
}

/**
 * Generate section intro based on tone
 */
function generateIntro(title: string, tone: string): string {
  const intros: Record<string, string[]> = {
    professional: [
      `In this section, we examine ${title.toLowerCase()} in detail, providing expert insights and actionable strategies.`,
      `When it comes to ${title.toLowerCase()}, a systematic approach yields the best results.`,
      `Let's explore the key aspects of ${title.toLowerCase()} and their practical applications.`,
    ],
    casual: [
      `Ready to dive into ${title.toLowerCase()}? Let's break it down in a way that actually makes sense.`,
      `Here's the deal with ${title.toLowerCase()} — it's simpler than you might think.`,
      `Let's talk about ${title.toLowerCase()} and how you can actually use it.`,
    ],
    friendly: [
      `Welcome to this section on ${title.toLowerCase()}! We're excited to share these helpful tips with you.`,
      `Let's explore ${title.toLowerCase()} together in a friendly, easy-to-understand way.`,
      `Glad you're here to learn about ${title.toLowerCase()}! Let's get started.`,
    ],
    authoritative: [
      `Based on industry research and best practices, ${title.toLowerCase()} represents a critical component of success.`,
      `Data demonstrates that ${title.toLowerCase()} is a key factor in achieving optimal outcomes.`,
      `Evidence suggests that understanding ${title.toLowerCase()} is essential for informed decision-making.`,
    ],
    minimalist: [
      `${title.toLowerCase()} explained simply.`,
      `Key points about ${title.toLowerCase()}.`,
      `${title.toLowerCase()}: The essentials.`,
    ],
    playful: [
      `Alright folks, let's tackle ${title.toLowerCase()} — don't worry, it's actually pretty fun!`,
      `Time to geek out over ${title.toLowerCase()}! Trust us, it's cooler than it sounds.`,
      `Let's dive into the wonderful world of ${title.toLowerCase()}!`,
    ],
  };

  const options = intros[tone] || intros.professional;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate paragraph content for a bullet point
 */
function generateParagraphForPoint(point: string, tone: string): string {
  return `This aspect of ${point.toLowerCase()} is particularly important because it directly impacts the overall effectiveness. By focusing on this area, you can achieve better results and avoid common pitfalls.`;
}

/**
 * Generate section conclusion based on tone
 */
function generateConclusion(title: string, tone: string): string {
  const conclusions: Record<string, string> = {
    professional: `In summary, ${title.toLowerCase()} requires careful consideration and strategic implementation. Following these guidelines will help ensure success.`,
    casual: `So that's ${title.toLowerCase()} in a nutshell! Pretty straightforward once you get the hang of it.`,
    friendly: `We hope this overview of ${title.toLowerCase()} has been helpful! Remember, we're always here if you have questions.`,
    authoritative: `The evidence clearly demonstrates the importance of ${title.toLowerCase()}. These findings are supported by industry research and best practices.`,
    minimalist: `${title.toLowerCase()} covered. Apply these principles consistently.`,
    playful: `And there you have it — ${title.toLowerCase()}! See? Not so scary after all!`,
  };

  const options = conclusions[tone] || conclusions.professional;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate default article sections when no outline is provided
 */
function generateDefaultSections(keyword: string, tone: string): string[] {
  return [
    `## Introduction\n\n${generateIntro(keyword, tone)}\n\nUnderstanding ${keyword} is essential in today's landscape. This guide will walk you through everything you need to know, from basic concepts to advanced strategies.`,
    `## What is ${keyword}?\n\n${keyword} refers to a critical concept that has gained significant attention in recent years. At its core, it involves understanding the fundamental principles and applying them effectively in real-world scenarios.\n\nThe importance of ${keyword} cannot be overstated. Organizations and individuals who master this area consistently see better outcomes compared to those who don't.`,
    `## Key Benefits\n\nWhen implemented correctly, ${keyword} offers numerous advantages:\n\n- **Improved Efficiency**: Streamlined processes and optimized workflows\n- **Better Results**: Higher quality outcomes with less wasted effort\n- **Cost Savings**: Reduced expenses through smarter resource allocation\n- **Competitive Advantage**: Stay ahead of others in your field`,
    `## How to Get Started\n\nReady to implement ${keyword}? Follow these steps:\n\n1. **Assess Your Current Situation**: Understand where you are and where you want to be\n2. **Set Clear Goals**: Define specific, measurable objectives\n3. **Create an Action Plan**: Break down your goals into manageable tasks\n4. **Execute and Monitor**: Implement your plan and track progress`,
    `## Common Mistakes to Avoid\n\nWhile working with ${keyword}, many people encounter these pitfalls:\n\n- Rushing into implementation without proper planning\n- Neglecting to measure and track results\n- Failing to adapt based on feedback and data\n- Trying to do too much at once instead of iterating gradually`,
    `## Conclusion\n\n${generateConclusion(keyword, tone)}\n\nRemember, mastery of ${keyword} takes time and practice. Start with the fundamentals, be patient with your progress, and continuously refine your approach based on results.`,
  ];
}

/**
 * Generate meta description for SEO
 */
function generateMetaDescription(keyword: string, tone: string): string {
  const descriptions: Record<string, string> = {
    professional: `Discover comprehensive strategies and expert insights on ${keyword}. Learn proven techniques to achieve optimal results in this detailed guide.`,
    casual: `Want to learn about ${keyword}? We break it down in a way that's actually useful. No fluff, just good info you can use.`,
    friendly: `Explore our friendly guide to ${keyword}! We share helpful tips and insights to make learning easy and enjoyable.`,
    authoritative: `Evidence-based guide to ${keyword} featuring industry research, expert analysis, and proven methodologies for optimal outcomes.`,
    minimalist: `${keyword}: Essential guide covering key concepts and practical applications.`,
    playful: `Dive into the world of ${keyword}! We make learning fun with examples and tips you'll actually remember.`,
  };

  const options = descriptions[tone] || descriptions.professional;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate meta keywords array
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
