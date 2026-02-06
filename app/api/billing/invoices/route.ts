/**
 * Invoices API Route
 *
 * Provides endpoints for retrieving billing history and invoices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrganizationId } from '@/lib/auth';

/**
 * Mock invoice data for demonstration
 */
function getMockInvoices(organizationId: string, limit = 12, offset = 0) {
  const invoices = [];
  const now = Date.now();

  for (let i = 0; i < limit; i++) {
    const monthOffset = i + offset;
    const invoiceDate = new Date(now - monthOffset * 30 * 24 * 60 * 60 * 1000);

    // Generate varying amounts
    const baseAmount = 4900; // $49.00 for Pro plan
    const variation = Math.floor(Math.random() * 2000) - 1000; // +/- $10
    const amount = Math.max(baseAmount + variation, 2900); // Min $29

    invoices.push({
      id: `inv_mock_${i + offset}`,
      organizationId,
      subscriptionId: 'sub_mock_123',
      stripeInvoiceId: `in_mock_${i + offset}`,
      amountPaid: amount,
      currency: 'usd',
      status: 'paid' as const,
      invoicePdf: `https://stripe.com/mock/pdf/invoice_${i + offset}.pdf`,
      hostedInvoiceUrl: `https://stripe.com/mock/invoice/${i + offset}`,
      dueDate: invoiceDate,
      paidAt: invoiceDate,
      description: 'Pro Plan - Monthly',
      lineItems: [
        {
          description: 'Pro Plan - Monthly',
          amount: amount,
          quantity: 1,
        },
      ],
      metadata: null,
      createdAt: new Date(invoiceDate.getTime() - 5 * 24 * 60 * 60 * 1000),
    });
  }

  return invoices;
}

/**
 * GET /api/billing/invoices
 *
 * Returns billing history for the organization
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = await requireOrganizationId();

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get mock invoices
    const invoices = getMockInvoices(organizationId, limit, offset);

    // Calculate totals
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalCount = 24; // Mock total count

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices.map((inv) => ({
          id: inv.id,
          date: inv.dueDate,
          amount: inv.amountPaid,
          currency: inv.currency,
          status: inv.status,
          description: inv.description,
          pdfUrl: inv.invoicePdf,
          hostedUrl: inv.hostedInvoiceUrl,
          lineItems: inv.lineItems,
        })),
        summary: {
          totalPaid,
          currency: 'USD',
          invoiceCount: invoices.length,
          totalCount,
        },
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
