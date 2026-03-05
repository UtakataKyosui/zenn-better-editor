import { Markdown } from '@tiptap/markdown';
import { Mathematics } from '@tiptap/extension-mathematics';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef } from 'react';
import { ZennDetails, ZennMessage } from '../tiptap/extensions/zenn-nodes';
import { ZennShikiCodeHighlight } from '../tiptap/extensions/shiki-code-highlight';
import { normalizeZennHtmlForTiptap } from '../utils/zenn-html';

type TiptapEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
  /** Pre-rendered HTML (from zenn-markdown-html) used for initial content parsing */
  initialHtml?: string;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

export const TiptapEditor = ({
  markdown,
  onChange,
  initialHtml,
  onScroll,
  className,
  id,
  ariaLabel,
}: TiptapEditorProps) => {
  const isUpdatingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const normalizedInitialHtml = useMemo(
    () => normalizeZennHtmlForTiptap(initialHtml || '', markdown),
    [initialHtml, markdown],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          defaultLanguage: 'text',
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          strict: 'ignore',
        },
      }),
      Markdown.configure({
        html: true,
        // biome-ignore lint/suspicious/noExplicitAny: Extending internal options
      } as any),
      ZennMessage,
      ZennDetails,
      ZennShikiCodeHighlight.configure({
        theme: 'github-dark',
        defaultLanguage: 'text',
      }),
    ],
    // Start with pre-rendered HTML so Zenn-specific blocks are parsed
    // by our custom node extensions via parseHTML rules
    content: normalizedInitialHtml || '',
    editorProps: {
      attributes: {
        class: className || '',
        id: id || '',
        'aria-label': ariaLabel || 'Markdown body',
      },
    },
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true;
      // biome-ignore lint/suspicious/noExplicitAny: Tiptap types might be incomplete
      const updatedMarkdown =
        (editor.storage.markdown as any)?.getMarkdown?.() || '';
      onChange(updatedMarkdown);

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
  });

  // When the editor is created and initialHtml is available, set it once
  useEffect(() => {
    if (!editor || hasInitializedRef.current) return;
    if (normalizedInitialHtml) {
      editor.commands.setContent(normalizedInitialHtml);
      hasInitializedRef.current = true;
    }
  }, [editor, normalizedInitialHtml]);

  useEffect(() => {
    if (!editor) return;

    editor.setOptions({
      editorProps: {
        attributes: {
          class: className || '',
          id: id || '',
          'aria-label': ariaLabel || 'Markdown body',
        },
      },
    });
  }, [editor, className, id, ariaLabel]);

  useEffect(() => {
    if (!editor || isUpdatingRef.current) return;

    if (!hasInitializedRef.current) {
      // Avoid parsing custom Zenn directives as plain text during first mount.
      if (normalizedInitialHtml) {
        editor.commands.setContent(normalizedInitialHtml);
        hasInitializedRef.current = true;
      }
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: Tiptap types might be incomplete
    const currentMarkdown =
      (editor.storage.markdown as any)?.getMarkdown?.() || '';
    if (currentMarkdown !== markdown) {
      if (normalizedInitialHtml) {
        editor.commands.setContent(normalizedInitialHtml);
        return;
      }

      editor.commands.setContent(markdown, { contentType: 'markdown' });
    }
  }, [markdown, normalizedInitialHtml, editor]);

  return (
    <div
      className="tiptap-scroll-container"
      onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      <EditorContent editor={editor} />
    </div>
  );
};
