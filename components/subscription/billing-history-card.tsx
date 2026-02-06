'use client';

/**
 * Billing History Card Component
 *
 * Displays invoice history with download options.
 */

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface BillingHistoryCardProps {
  invoices: Invoice[];
  totalCount?: number;
  isLoading?: boolean;
}

export function BillingHistoryCard({
  invoices,
  totalCount = 0,
  isLoading = false,
}: BillingHistoryCardProps) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Get current page items
  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  const handleDownload = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    if (invoice.hostedUrl) {
      window.open(invoice.hostedUrl, '_blank');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="card" data-testid="billing-history-card">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-3">
            <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Billing History
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and download your past invoices
            </p>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading invoices...
            </p>
          </div>
        ) : currentInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No invoices yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your billing history will appear here once you have an active
              subscription.
            </p>
          </div>
        ) : (
          currentInvoices.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              formatDate={formatDate}
              formatAmount={formatAmount}
              onDownload={() => handleDownload(invoice)}
              onView={() => handleViewInvoice(invoice)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of{' '}
              {totalCount} invoices
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page <= 2) {
                    pageNum = i;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'min-w-[2.5rem] rounded-lg px-3 py-1 text-sm font-medium transition-colors',
                        page === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                      )}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className={cn(
                  'rounded-lg p-2 transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InvoiceRowProps {
  invoice: Invoice;
  formatDate: (date: Date) => string;
  formatAmount: (amount: number, currency: string) => string;
  onDownload: () => void;
  onView: () => void;
}

function InvoiceRow({
  invoice,
  formatDate,
  formatAmount,
  onDownload,
  onView,
}: InvoiceRowProps) {
  const statusStyles: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    paid: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      label: 'Paid',
    },
    open: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      label: 'Pending',
    },
    void: {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-400',
      label: 'Void',
    },
    uncollectible: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-400',
      label: 'Uncollectible',
    },
  };

  const status = statusStyles[invoice.status] || statusStyles.paid;

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {/* Date */}
        <div className="w-24 flex-shrink-0 text-sm text-gray-600 dark:text-gray-400 sm:w-32">
          {formatDate(invoice.date)}
        </div>

        {/* Description */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {invoice.description}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400 sm:hidden">
            {formatAmount(invoice.amount, invoice.currency)}
          </p>
        </div>

        {/* Status (hidden on mobile) */}
        <span
          className={cn(
            'hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-block',
            status.bg,
            status.text
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Amount and Actions */}
      <div className="ml-4 flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatAmount(invoice.amount, invoice.currency)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {invoice.hostedUrl && (
            <button
              onClick={onView}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="View invoice"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          {invoice.pdfUrl && (
            <button
              onClick={onDownload}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Download PDF"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
