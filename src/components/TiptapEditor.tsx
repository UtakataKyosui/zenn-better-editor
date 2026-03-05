import { Markdown } from '@tiptap/markdown';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MermaidPreview,
  type MermaidEditPayload,
} from '../tiptap/extensions/mermaid-preview';
import { ZennCodeBlock } from '../tiptap/extensions/zenn-code-block';
import { ZennEmbedBlock } from '../tiptap/extensions/zenn-embeds';
import { ZennImage } from '../tiptap/extensions/zenn-image';
import { ZennDetails, ZennMessage } from '../tiptap/extensions/zenn-nodes';
import { ZennShikiCodeHighlight } from '../tiptap/extensions/shiki-code-highlight';
import { normalizeZennHtmlForTiptap } from '../utils/zenn-html';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import {
  ZENN_CONTAINER_CONVERSION_META_KEY,
  convertTypedZennContainers,
} from '../utils/zenn-container-transform';

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
  const [mermaidModal, setMermaidModal] = useState<MermaidEditPayload | null>(
    null,
  );
  const [mermaidDraft, setMermaidDraft] = useState('');
  const normalizedInitialHtml = useMemo(
    () => normalizeZennHtmlForTiptap(initialHtml || '', markdown),
    [initialHtml, markdown],
  );
  const handleOpenMermaidEditor = useCallback((payload: MermaidEditPayload) => {
    setMermaidModal(payload);
    setMermaidDraft(payload.source);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Use custom extension to preserve Zenn filename metadata in code blocks.
        codeBlock: false,
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
      Table.configure({
        resizable: false,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ZennMessage,
      ZennDetails,
      ZennCodeBlock.configure({
        defaultLanguage: 'text',
      }),
      ZennImage,
      ZennEmbedBlock,
      ZennShikiCodeHighlight.configure({
        theme: 'github-dark',
        defaultLanguage: 'text',
      }),
      MermaidPreview.configure({
        onEdit: handleOpenMermaidEditor,
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
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.getMeta(ZENN_CONTAINER_CONVERSION_META_KEY)) {
        const converted = convertTypedZennContainers(editor);
        if (converted) {
          return;
        }
      }

      isUpdatingRef.current = true;
      const updatedMarkdown = editor.getMarkdown();
      onChange(updatedMarkdown);

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
  });

  useEffect(() => {
    if (!mermaidModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMermaidModal(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mermaidModal]);

  // When the editor is created and initialHtml is available, set it once
  useEffect(() => {
    if (!editor || hasInitializedRef.current) return;
    if (normalizedInitialHtml) {
      editor.commands.setContent(normalizedInitialHtml, { emitUpdate: false });
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
        editor.commands.setContent(normalizedInitialHtml, { emitUpdate: false });
        hasInitializedRef.current = true;
      }
      return;
    }

    const currentMarkdown = editor.getMarkdown();
    if (currentMarkdown !== markdown) {
      if (normalizedInitialHtml) {
        editor.commands.setContent(normalizedInitialHtml, { emitUpdate: false });
        return;
      }

      editor.commands.setContent(markdown, {
        contentType: 'markdown',
        emitUpdate: false,
      });
    }
  }, [markdown, normalizedInitialHtml, editor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('HappyDOM')
    ) {
      return;
    }
    bootZennEmbedRuntime();
  }, []);

  const applyMermaidChanges = useCallback(() => {
    if (!editor || !mermaidModal) return;

    const nextSource = mermaidDraft.replace(/\r\n?/g, '\n');
    const updated = editor.commands.command(({ state, tr, dispatch }) => {
      const targetNode = state.doc.nodeAt(mermaidModal.pos);
      if (!targetNode || targetNode.type.name !== 'codeBlock') {
        return false;
      }

      const codeBlockType = state.schema.nodes.codeBlock;
      const nextContent = nextSource ? [state.schema.text(nextSource)] : undefined;
      const nextNode = codeBlockType.create(
        {
          ...targetNode.attrs,
          language: targetNode.attrs.language || mermaidModal.language,
        },
        nextContent,
      );

      tr.replaceWith(
        mermaidModal.pos,
        mermaidModal.pos + targetNode.nodeSize,
        nextNode,
      );
      dispatch?.(tr);
      return true;
    });

    if (updated) {
      setMermaidModal(null);
    }
  }, [editor, mermaidDraft, mermaidModal]);

  return (
    <div
      className="tiptap-scroll-container"
      onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      <EditorContent editor={editor} />
      {mermaidModal && (
        <div
          className="tiptap-mermaid-modal-backdrop"
          role="presentation"
          onClick={() => setMermaidModal(null)}
        >
          <section
            className="tiptap-mermaid-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit Mermaid diagram"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="tiptap-mermaid-modal__header">
              <h3>Edit Mermaid</h3>
              <p>Update the Mermaid source and apply it to this block.</p>
            </header>

            <textarea
              className="tiptap-mermaid-modal__input"
              value={mermaidDraft}
              onChange={(event) => setMermaidDraft(event.target.value)}
              spellCheck={false}
              aria-label="Mermaid source"
            />

            <footer className="tiptap-mermaid-modal__actions">
              <button
                type="button"
                className="tiptap-mermaid-modal__btn tiptap-mermaid-modal__btn--ghost"
                onClick={() => setMermaidModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tiptap-mermaid-modal__btn"
                onClick={applyMermaidChanges}
              >
                Apply
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
