import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';

/**
 * Get Available Pricing Plans
 *
 * GET /api/stripe/prices
 *
 * Returns all active products and prices for the application
 *
 * Query params:
 * - activeOnly: boolean (default: true)
 * - limit: number (default: 100)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const stripe = getStripeClient();

    // List all active products
    const products = await stripe.products.list({
      active: activeOnly,
      limit,
    });

    // Get prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: activeOnly,
          limit: 10,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: prices.data.map((price) => ({
            id: price.id,
            unitAmount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval,
            intervalCount: price.recurring?.interval_count,
            trialPeriodDays: price.recurring?.trial_period_days,
            type: price.type,
          })),
        };
      })
    );

    // Filter out products without prices
    const validProducts = productsWithPrices.filter(
      (product) => product.prices.length > 0
    );

    return NextResponse.json({
      products: validProducts,
      count: validProducts.length,
    });
  } catch (error) {
    console.error('Error fetching prices:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch prices', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
