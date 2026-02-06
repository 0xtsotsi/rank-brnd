'use client';

/**
 * Tiptap Rich Text Editor Component
 *
 * A rich text editor built with Tiptap for article content editing.
 * Features:
 * - Rich text formatting (bold, italic, underline, headings, lists)
 * - Auto-save with debouncing
 * - Word count and character count
 * - Readability metrics
 * - Dark mode support
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TiptapEditorProps {
  /** Initial content (HTML or JSON) */
  initialContent?: string;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Called when content changes (debounced) */
  onUpdate?: (
    content: string,
    wordCount: number,
    characterCount: number
  ) => void;
  /** Editor height */
  height?: string;
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Additional class names */
  className?: string;
}

export function TiptapEditor({
  initialContent = '',
  placeholder = 'Start writing your article...',
  onUpdate,
  height = '500px',
  showToolbar = true,
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Typography,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-full',
          'prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white',
          'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-white',
          'prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100',
          'prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic',
          'prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4',
          'prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline'
        ),
      },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      if (onUpdate) {
        const html = editor.getHTML();
        const wordCount = calculateWordCount(editor.getText());
        const characterCount = editor.storage.characterCount.characters();
        // Debounce will be handled by the parent component
        onUpdate(html, wordCount, characterCount);
      }
    },
  });

  const wordCount = editor ? calculateWordCount(editor.getText()) : 0;
  const characterCount = editor?.storage.characterCount.characters() || 0;

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse',
          className
        )}
        style={{ height }}
      />
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    disabled,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive &&
          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden',
        className
      )}
    >
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Headings */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Text Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Blockquote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor Content */}
      <div style={{ height }} className="overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm">
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          <span>
            <span className="font-medium text-gray-900 dark:text-white">
              {wordCount}
            </span>{' '}
            words
          </span>
          <span>
            <span className="font-medium text-gray-900 dark:text-white">
              {characterCount}
            </span>{' '}
            characters
          </span>
        </div>
        <div className="text-gray-500 dark:text-gray-500">
          {calculateReadingTime(wordCount)} min read
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate word count from text
 */
function calculateWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Calculate estimated reading time in minutes
 */
function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Calculate readability score based on Flesch Reading Ease
 */
export function calculateReadabilityScore(text: string): {
  score: number;
  level: string;
  description: string;
} {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0);

  if (words.length === 0 || sentences.length === 0) {
    return { score: 0, level: 'N/A', description: 'No content' };
  }

  // Flesch Reading Ease formula
  const score = Math.max(
    0,
    Math.min(
      100,
      206.835 -
        1.015 * (words.length / sentences.length) -
        84.6 * (syllables / words.length)
    )
  );

  let level = '';
  let description = '';

  if (score >= 90) {
    level = 'Very Easy';
    description = '5th grade level';
  } else if (score >= 80) {
    level = 'Easy';
    description = '6th grade level';
  } else if (score >= 70) {
    level = 'Fairly Easy';
    description = '7th grade level';
  } else if (score >= 60) {
    level = 'Standard';
    description = '8th-9th grade level';
  } else if (score >= 50) {
    level = 'Fairly Difficult';
    description = '10th-12th grade level';
  } else if (score >= 30) {
    level = 'Difficult';
    description = 'College level';
  } else {
    level = 'Very Difficult';
    description = 'Professional/academic level';
  }

  return { score, level, description };
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);

  return matches ? matches.length : 1;
}
