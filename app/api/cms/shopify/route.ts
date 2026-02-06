/**
 * Shopify CMS API Route
 *
 * This route handles publishing content to Shopify via the Admin API.
 * Supports articles, products, collections, and image uploads.
 *
 * @endpoint GET /api/cms/shopify - Get shop info and blogs
 * @endpoint POST /api/cms/shopify - Publish article/product
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createShopifyAdapter,
  CMSError,
  CMSPost,
  ShopifyAdapter,
} from '@/lib/cms';
import type {
  ShopifyProductInput,
  ShopifyCollectionInput,
  ShopifyImageUpload,
  ShopifyArticleInput,
} from '@/types/shopify';

/**
 * Request validation schema for publishing articles
 */
const publishArticleSchema = z.object({
  type: z.literal('article'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  contentHtml: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publishStatus: z
    .enum(['draft', 'public', 'unlisted'])
    .optional()
    .default('draft'),
  canonicalUrl: z.string().url().optional(),
  blogId: z.number().optional(),
  author: z.string().optional(),
});

/**
 * Request validation schema for creating products
 */
const createProductSchema = z.object({
  type: z.literal('product'),
  title: z.string().min(1, 'Title is required'),
  body_html: z.string().optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional().default('draft'),
  variants: z
    .array(
      z.object({
        option1: z.string().optional(),
        option2: z.string().optional(),
        option3: z.string().optional(),
        price: z.string().optional(),
        sku: z.string().optional(),
        inventory_quantity: z.number().optional(),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        src: z.string().url(),
        alt: z.string().optional(),
        position: z.number().optional(),
      })
    )
    .optional(),
  options: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
      })
    )
    .optional(),
});

/**
 * Request validation schema for creating collections
 */
const createCollectionSchema = z.object({
  type: z.literal('collection'),
  title: z.string().min(1, 'Title is required'),
  body_html: z.string().optional(),
  handle: z.string().optional(),
  published: z.boolean().optional().default(true),
  image: z
    .object({
      src: z.string().url(),
      alt: z.string().optional(),
    })
    .optional(),
});

/**
 * Request validation schema for uploading images
 */
const uploadImageSchema = z.object({
  type: z.literal('image-upload'),
  productId: z.number(),
  images: z
    .array(
      z.object({
        src: z.string().url(),
        alt: z.string().optional(),
        position: z.number().optional(),
      })
    )
    .min(1, 'At least one image is required'),
});

/**
 * Combined request schema
 */
const shopifyRequestSchema = z.discriminatedUnion('type', [
  publishArticleSchema,
  createProductSchema,
  createCollectionSchema,
  uploadImageSchema,
]);

/**
 * Common configuration schema
 */
const configSchema = z.object({
  shopDomain: z.string().min(1, 'Shop domain is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  apiVersion: z.string().optional(),
});

/**
 * GET handler - Get shop info and blogs
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get configuration from query params or environment
    const searchParams = request.nextUrl.searchParams;
    const shopDomain =
      searchParams.get('shopDomain') || process.env.SHOPIFY_SHOP_DOMAIN;
    const accessToken =
      searchParams.get('accessToken') || process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        {
          error: 'Shopify credentials are required',
          details: 'Provide shopDomain and accessToken',
        },
        { status: 400 }
      );
    }

    const adapter = createShopifyAdapter({ shopDomain, accessToken });

    // Get shop information and blogs in parallel
    const [shop, blogsResult] = await Promise.all([
      (adapter as ShopifyAdapter).getShop(),
      (adapter as ShopifyAdapter).listBlogs({ limit: 50 }),
    ]);

    return NextResponse.json({
      success: true,
      shop: {
        id: String(shop.id),
        name: shop.name,
        domain: shop.domain,
        email: shop.email,
        currency: shop.currency,
        timezone: shop.iana_timezone,
        url: `https://${shop.domain}`,
      },
      blogs: blogsResult.success ? blogsResult.data.blogs : [],
    });
  } catch (error) {
    console.error('Shopify GET error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get Shopify shop info' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Publish content to Shopify
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = shopifyRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Get configuration from request or environment
    const configResult = configSchema.safeParse({
      shopDomain: body.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: body.accessToken || process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: body.apiVersion || process.env.SHOPIFY_API_VERSION,
    });

    if (!configResult.success) {
      return NextResponse.json(
        {
          error: 'Shopify credentials are required',
          details: configResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const adapter = createShopifyAdapter(configResult.data);
    const shopifyAdapter = adapter as ShopifyAdapter;

    // Handle different request types
    switch (data.type) {
      case 'article': {
        // Publish an article to a blog
        const post: CMSPost = {
          title: data.title,
          content: data.content,
          contentHtml: data.contentHtml,
          tags: data.tags,
          publishStatus: data.publishStatus,
          canonicalUrl: data.canonicalUrl,
        };

        const publishResult = await adapter.publish(post);

        // If blogId was specified and different from default, update article
        if (data.blogId) {
          const blogsResult = await shopifyAdapter.listBlogs({ limit: 50 });
          if (blogsResult.success) {
            const targetBlog = blogsResult.data.blogs.find(
              (b) => b.id === data.blogId
            );
            if (targetBlog) {
              // Re-publish to the specified blog
              const articleInput = {
                title: data.title,
                content_html:
                  data.contentHtml ||
                  shopifyAdapter['markdownToHtml']?.(data.content) ||
                  data.content,
                author: data.author,
                tags: data.tags?.join(', ') || '',
                published: data.publishStatus === 'public',
              };
              const result = await shopifyAdapter.createArticle(
                data.blogId,
                articleInput
              );
              if (result.success) {
                return NextResponse.json({
                  success: true,
                  type: 'article',
                  postId: String(result.data.id),
                  url: `https://${configResult.data.shopDomain}/blogs/${targetBlog.handle}/${result.data.handle}`,
                  metadata: {
                    blogId: data.blogId,
                    handle: result.data.handle,
                    publishedAt: result.data.published_at,
                  },
                });
              }
            }
          }
        }

        return NextResponse.json({
          ...publishResult,
          type: 'article',
        });
      }

      case 'product': {
        // Create a product
        const productInput: ShopifyProductInput = {
          title: data.title,
          body_html: data.body_html,
          product_type: data.product_type,
          vendor: data.vendor,
          tags: data.tags?.join(', '),
          status: data.status,
          variants: data.variants,
          images: data.images,
          options: data.options,
        };

        const result = await shopifyAdapter.createProduct(productInput);

        if (!result.success) {
          throw new CMSError(
            result.error.message,
            'PRODUCT_CREATE_ERROR',
            undefined,
            { details: result.error.details }
          );
        }

        return NextResponse.json({
          success: true,
          type: 'product',
          productId: String(result.data.id),
          handle: result.data.handle,
          url: `https://${configResult.data.shopDomain}/products/${result.data.handle}`,
          metadata: {
            status: result.data.status,
            createdAt: result.data.created_at,
          },
        });
      }

      case 'collection': {
        // Create a collection
        const collectionInput: ShopifyCollectionInput = {
          title: data.title,
          body_html: data.body_html,
          handle: data.handle,
          published: data.published,
          image: data.image,
        };

        const result = await shopifyAdapter.createCollection(collectionInput);

        if (!result.success) {
          throw new CMSError(
            result.error.message,
            'COLLECTION_CREATE_ERROR',
            undefined,
            { details: result.error.details }
          );
        }

        return NextResponse.json({
          success: true,
          type: 'collection',
          collectionId: String(result.data.id),
          handle: result.data.handle,
          url: `https://${configResult.data.shopDomain}/collections/${result.data.handle}`,
          metadata: {
            publishedAt: result.data.published_at,
          },
        });
      }

      case 'image-upload': {
        // Upload images to a product
        const images = data.images.map((img) => ({
          src: img.src,
          alt: img.alt || undefined,
          position: img.position,
        }));

        const result = await shopifyAdapter.uploadProductImages(
          data.productId,
          images
        );

        if (!result.success) {
          throw new CMSError(
            result.error.message,
            'IMAGE_UPLOAD_ERROR',
            undefined,
            { details: result.error.details }
          );
        }

        return NextResponse.json({
          success: true,
          type: 'image-upload',
          productId: String(data.productId),
          images: result.data.map((img) => ({
            id: String(img.id),
            src: img.src,
            alt: img.alt,
            position: img.position,
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unsupported request type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Shopify POST error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process Shopify request' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler - Update existing content
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get configuration
    const configResult = configSchema.safeParse({
      shopDomain: body.shopDomain || process.env.SHOPIFY_SHOP_DOMAIN,
      accessToken: body.accessToken || process.env.SHOPIFY_ACCESS_TOKEN,
      apiVersion: body.apiVersion || process.env.SHOPIFY_API_VERSION,
    });

    if (!configResult.success) {
      return NextResponse.json(
        { error: 'Shopify credentials are required' },
        { status: 400 }
      );
    }

    const adapter = createShopifyAdapter(configResult.data) as ShopifyAdapter;
    const { type, id, ...updates } = body;

    let result;

    switch (type) {
      case 'product':
        result = await adapter.updateProduct(
          Number(id),
          updates as Partial<ShopifyProductInput>
        );
        break;
      case 'collection':
        result = await adapter.updateCollection(
          Number(id),
          updates as Partial<ShopifyCollectionInput>
        );
        break;
      case 'article': {
        const blogId = Number(body.blogId);
        result = await adapter.updateArticle(
          blogId,
          Number(id),
          updates as Partial<ShopifyArticleInput>
        );
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Unsupported type for update' },
          { status: 400 }
        );
    }

    if (!result.success) {
      throw new CMSError(result.error.message, 'UPDATE_ERROR');
    }

    return NextResponse.json({
      success: true,
      type,
      id: String(id),
      data: result.data,
    });
  } catch (error) {
    console.error('Shopify PUT error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update Shopify resource' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete content
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const blogId = searchParams.get('blogId');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    // Get configuration from query params or environment
    const shopDomain =
      searchParams.get('shopDomain') || process.env.SHOPIFY_SHOP_DOMAIN;
    const accessToken =
      searchParams.get('accessToken') || process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Shopify credentials are required' },
        { status: 400 }
      );
    }

    const adapter = createShopifyAdapter({
      shopDomain,
      accessToken,
    }) as ShopifyAdapter;

    let result;

    switch (type) {
      case 'product':
        result = await adapter.deleteProduct(Number(id));
        break;
      case 'collection':
        result = await adapter.deleteCollection(Number(id));
        break;
      case 'article':
        if (!blogId) {
          return NextResponse.json(
            { error: 'Blog ID is required for deleting articles' },
            { status: 400 }
          );
        }
        result = await adapter.deleteArticle(Number(blogId), Number(id));
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported type for deletion' },
          { status: 400 }
        );
    }

    if (!result.success) {
      throw new CMSError(result.error.message, 'DELETE_ERROR');
    }

    return NextResponse.json({
      success: true,
      type,
      id,
      message: `${type} deleted successfully`,
    });
  } catch (error) {
    console.error('Shopify DELETE error:', error);

    if (error instanceof CMSError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete Shopify resource' },
      { status: 500 }
    );
  }
}
