'use client';

/**
 * Content Edit Dialog Component
 * Modal dialog for viewing and editing content items with keyword linking
 */

import { useState, useEffect } from 'react';
import type { ContentItem, EventStatus } from '@/types/content-planner';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/calendar';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  CONTENT_TYPE_ICONS,
} from '@/types/content-planner';
import { formatDate } from '@/lib/calendar-utils';
import { cn } from '@/lib/utils';
import {
  X,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Save,
  Link as LinkIcon,
  Tag,
  Plus,
  X as XIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ContentEditDialogProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (item: ContentItem) => void;
  onDelete?: (itemId: string) => void;
  onStatusUpdate?: (itemId: string, newStatus: EventStatus) => void;
  onKeywordLink?: (itemId: string, keywordId: string) => void;
  availableKeywords?: Array<{ id: string; term: string }>;
}

export function ContentEditDialog({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onStatusUpdate,
  onKeywordLink,
  availableKeywords = [],
}: ContentEditDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<ContentItem | null>(null);
  const [newKeyword, setNewKeyword] = useState('');

  // Reset edit state when item changes
  useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
      setIsEditing(false);
      setNewKeyword('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const currentItem = isEditing ? editedItem || item : item;
  const statusColors =
    STATUS_COLORS[currentItem.status] || STATUS_COLORS.pending;
  const contentTypeColors = CONTENT_TYPE_COLORS[currentItem.contentType];

  // Get icon component by name
  const IconComponent = ({
    iconName,
    className,
  }: {
    iconName: string;
    className?: string;
  }) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className={className} /> : null;
  };

  const handleSave = () => {
    if (editedItem && onSave) {
      onSave(editedItem);
      setIsEditing(false);
    }
  };

  const handleStatusChange = (newStatus: EventStatus) => {
    if (isEditing && editedItem) {
      setEditedItem({ ...editedItem, status: newStatus });
    } else {
      onStatusUpdate?.(item.id, newStatus);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      onDelete?.(item.id);
      onClose();
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && editedItem) {
      setEditedItem({
        ...editedItem,
        keywords: [...editedItem.keywords, newKeyword.trim()],
      });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    if (editedItem) {
      setEditedItem({
        ...editedItem,
        keywords: editedItem.keywords.filter((k) => k !== keywordToRemove),
      });
    }
  };

  const handleLinkKeyword = (keywordId: string) => {
    onKeywordLink?.(item.id, keywordId);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isEditing) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-dialog-title"
      data-testid="content-edit-dialog"
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all max-h-[90vh] overflow-hidden flex flex-col',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between rounded-t-2xl px-6 py-4 border-b',
            statusColors.bg,
            'border-gray-200 dark:border-gray-700'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                contentTypeColors.bg,
                contentTypeColors.text
              )}
            >
              <IconComponent
                iconName={CONTENT_TYPE_ICONS[currentItem.contentType]}
                className="h-5 w-5"
              />
            </div>
            <div>
              <h3
                id="content-dialog-title"
                className={cn(
                  'text-lg font-semibold text-gray-900 dark:text-white'
                )}
              >
                {isEditing ? 'Edit Content' : 'Content Details'}
              </h3>
              <p className={cn('text-sm', statusColors.text)}>
                {CONTENT_TYPE_LABELS[currentItem.contentType]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'rounded-full p-2 transition-colors hover:bg-black/10',
                  'text-gray-600 dark:text-gray-400'
                )}
                aria-label="Edit content"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className={cn(
                'rounded-full p-2 transition-colors hover:bg-black/10',
                'text-gray-600 dark:text-gray-400'
              )}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editedItem?.title || ''}
                onChange={(e) =>
                  setEditedItem((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-lg font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Content title"
              />
            ) : (
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentItem.title}
              </h4>
            )}
            {isEditing ? (
              <textarea
                value={editedItem?.description || ''}
                onChange={(e) =>
                  setEditedItem((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Description (optional)"
                rows={2}
              />
            ) : (
              currentItem.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {currentItem.description}
                </p>
              )
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as EventStatus[]).map((status) => {
                const colors = STATUS_COLORS[status];
                const isActive = currentItem.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                      colors.bg,
                      isActive
                        ? colors.text + ' ' + colors.border + ' border'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        status === 'pending' && 'bg-yellow-400',
                        status === 'in-progress' && 'bg-blue-400',
                        status === 'completed' && 'bg-green-400',
                        status === 'cancelled' && 'bg-gray-400',
                        status === 'overdue' && 'bg-red-400'
                      )}
                    />
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Info */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
              Scheduled Date
            </label>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              {isEditing ? (
                <input
                  type="date"
                  value={
                    editedItem?.scheduledDate.toISOString().split('T')[0] || ''
                  }
                  onChange={(e) =>
                    setEditedItem((prev) =>
                      prev
                        ? { ...prev, scheduledDate: new Date(e.target.value) }
                        : null
                    )
                  }
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <span>{formatDate(currentItem.scheduledDate, 'long')}</span>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
              Keywords
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {currentItem.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm',
                      'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                      'border border-indigo-200 dark:border-indigo-800'
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {keyword}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Add keyword..."
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Keyword Linking */}
          {!isEditing && onKeywordLink && availableKeywords.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
                Link to Keyword
              </label>
              <div className="space-y-1">
                {availableKeywords.map((keyword) => (
                  <button
                    key={keyword.id}
                    onClick={() => handleLinkKeyword(keyword.id)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'text-gray-700 dark:text-gray-300',
                      currentItem.linkedKeywordId === keyword.id &&
                        'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    )}
                  >
                    <LinkIcon className="h-4 w-4" />
                    {keyword.term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(currentItem.wordCount || currentItem.estimatedReadTime) && (
            <div className="grid grid-cols-2 gap-4">
              {currentItem.wordCount && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{currentItem.wordCount}</span>{' '}
                  words
                </div>
              )}
              {currentItem.estimatedReadTime && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>{currentItem.estimatedReadTime} min read</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {isEditing ? (
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
                Notes
              </label>
              <textarea
                value={editedItem?.notes || ''}
                onChange={(e) =>
                  setEditedItem((prev) =>
                    prev ? { ...prev, notes: e.target.value } : null
                  )
                }
                placeholder="Add notes about this content..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>
          ) : (
            currentItem.notes && (
              <div>
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 block">
                  Notes
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                  {currentItem.notes}
                </p>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={handleDelete}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
              'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
              'transition-colors'
            )}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedItem(item);
              }}
              className={cn(
                'inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {isEditing ? 'Cancel' : 'Close'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                  'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                )}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
