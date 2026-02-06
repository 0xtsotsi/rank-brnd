'use client';

/**
 * Bulk Import Dialog Component
 * Modal dialog for bulk importing keywords from CSV or text input
 */

import { useState, useRef } from 'react';
import type { KeywordImportRow, ImportResult } from '@/types/keyword-research';
import { cn } from '@/lib/utils';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (keywords: KeywordImportRow[]) => Promise<ImportResult>;
  className?: string;
}

export function BulkImportDialog({
  isOpen,
  onClose,
  onImport,
  className,
}: BulkImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  const handleClose = () => {
    if (!isImporting) {
      setCsvText('');
      setImportResult(null);
      onClose();
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setActiveTab('paste');
    };
    reader.readAsText(file);
  };

  // Parse and import keywords
  const handleImport = async () => {
    if (!csvText.trim()) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const rows = parseCSV(csvText);
      const result = await onImport(rows);
      setImportResult(result);

      // If successful, close after a delay
      if (result.failed === 0) {
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (error) {
      setImportResult({
        total: 0,
        successful: 0,
        failed: 1,
        errors: [
          {
            row: 0,
            keyword: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Simple CSV parser
  const parseCSV = (text: string): KeywordImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    // Detect if first line is header
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes('keyword') ||
      firstLine.includes('volume') ||
      firstLine.includes('difficulty');

    const startIndex = hasHeader ? 1 : 0;
    const rows: KeywordImportRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values[0] && values[0].length > 0) {
        rows.push({
          keyword: values[0],
          searchVolume: values[1],
          cpc: values[2],
          difficulty: values[3],
          intent: values[4],
          tags: values[5],
          targetUrl: values[6],
          notes: values[7],
        });
      }
    }

    return rows;
  };

  // Get preview rows
  const previewRows = parseCSV(csvText);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'animate-fade-in',
        className
      )}
      onClick={handleClose}
      data-testid="bulk-import-dialog"
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bulk Import Keywords
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Import multiple keywords at once from CSV or text
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('paste')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'paste'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <FileText className="h-4 w-4" />
              Paste CSV
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'upload'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* CSV Format Guide */}
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              <strong>CSV Format:</strong> keyword, searchVolume, cpc,
              difficulty, intent, tags, targetUrl, notes
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              best running shoes, 45000, 1.85, hard, transactional, ecommerce,
              /blog/best-shoes, Review top shoes
            </p>
            <button
              onClick={() => {
                setCsvText(
                  'keyword,searchVolume,cpc,difficulty,intent,tags,targetUrl,notes\nbest running shoes,45000,1.85,hard,transactional,ecommerce,/blog/best-shoes,Review top shoes\nhow to tie shoes,3200,0.45,easy,informational,tutorial,/blog/tie-shoes,Step by step guide'
                );
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Load example data
            </button>
          </div>

          {/* Text Area for CSV Input */}
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Paste your CSV data here..."
            rows={8}
            disabled={isImporting}
            className={cn(
              'w-full p-3 rounded-lg border font-mono text-sm resize-none',
              'border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              'disabled:opacity-50'
            )}
            data-testid="csv-input"
          />

          {/* Preview */}
          {previewRows.length > 0 && !importResult && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Preview ({previewRows.length} keywords):
              </p>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                        Keyword
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                        Volume
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                        Difficulty
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">
                        Intent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {previewRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-900 dark:text-white">
                          {row.keyword}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {row.searchVolume || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {row.difficulty || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                          {row.intent || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={cn(
                'mt-4 p-4 rounded-lg border',
                importResult.failed === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              )}
              data-testid="import-result"
            >
              <div className="flex items-start gap-3">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {importResult.failed === 0
                      ? 'Import Successful!'
                      : 'Import Completed with Errors'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {importResult.successful} of {importResult.total} keywords
                    imported successfully
                  </p>

                  {/* Show Errors */}
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Errors:
                      </p>
                      {importResult.errors.slice(0, 5).map((error, i) => (
                        <p
                          key={i}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          Row {error.row} ({error.keyword}): {error.error}
                        </p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ...and {importResult.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !csvText.trim()}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              'bg-indigo-600 text-white hover:bg-indigo-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="import-button"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {previewRows.length} Keywords
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
