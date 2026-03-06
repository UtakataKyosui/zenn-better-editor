import { Markdown } from '@tiptap/markdown';
import { Mathematics } from '@tiptap/extension-mathematics';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MermaidPreview,
  type MermaidEditPayload,
} from './extensions/mermaid-preview';
import { ZennCodeBlock } from './extensions/zenn-code-block';
import { ZennEmbedBlock } from './extensions/zenn-embeds';
import {
  ZennFootnoteReference,
  ZennFootnotesSection,
} from './extensions/zenn-footnotes';
import { ZennImage } from './extensions/zenn-image';
import { ZennDetails, ZennMessage } from './extensions/zenn-containers';
import { ZennShikiCodeHighlight } from './extensions/shiki-code-highlight';
import { normalizeZennHtmlForTiptap } from './zenn-html';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import {
  ZENN_CONTAINER_CONVERSION_META_KEY,
  convertTypedZennContainers,
} from './extensions/zenn-container-transform';
import {
  ZENN_IMAGE_CONVERSION_META_KEY,
  convertTypedZennImages,
} from './extensions/zenn-image-transform';
import {
  ZENN_FOOTNOTE_CONVERSION_META_KEY,
  convertTypedZennFootnotes,
} from './extensions/zenn-footnote-transform';

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
      ZennFootnoteReference,
      ZennFootnotesSection,
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
      if (!transaction.getMeta(ZENN_IMAGE_CONVERSION_META_KEY)) {
        const converted = convertTypedZennImages(editor);
        if (converted) {
          return;
        }
      }
      if (!transaction.getMeta(ZENN_FOOTNOTE_CONVERSION_META_KEY)) {
        const converted = convertTypedZennFootnotes(editor);
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


  const isInTable = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? e.isActive('tableCell') || e.isActive('tableHeader') : false,
  });

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

  const tableToolbar =
    isInTable && editor ? (
      <div
        className="tiptap-table-toolbar"
        aria-label="Table actions"
        onMouseDown={(e) => e.preventDefault()}
      >
          <span className="tiptap-table-toolbar__group-label">行</span>
          <button
            type="button"
            title="上に行を追加"
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            ↑ 追加
          </button>
          <button
            type="button"
            title="下に行を追加"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            ↓ 追加
          </button>
          <button
            type="button"
            title="行を削除"
            className="tiptap-table-toolbar__btn--danger"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            削除
          </button>
          <span className="tiptap-table-toolbar__divider" aria-hidden="true" />
          <span className="tiptap-table-toolbar__group-label">列</span>
          <button
            type="button"
            title="左に列を追加"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            ← 追加
          </button>
          <button
            type="button"
            title="右に列を追加"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            → 追加
          </button>
          <button
            type="button"
            title="列を削除"
            className="tiptap-table-toolbar__btn--danger"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            削除
          </button>
          <span className="tiptap-table-toolbar__divider" aria-hidden="true" />
          <button
            type="button"
            title="テーブルを削除"
            className="tiptap-table-toolbar__btn--danger"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            テーブル削除
          </button>
        </div>
    ) : null;

  return (
    <div className="tiptap-scroll-container" onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}>
      {tableToolbar}
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
