import katex from 'katex';
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
  type MermaidModalState = { pos: number | null; source: string; language: string };
  const [mermaidModal, setMermaidModal] = useState<MermaidModalState | null>(null);
  const [mermaidDraft, setMermaidDraft] = useState('');

  type MathModalState = {
    formula: string;
    type: 'inline' | 'block';
    pos: number | null;
    endPos: number | null;
  };
  const [mathModal, setMathModal] = useState<MathModalState | null>(null);
  const [mathDraft, setMathDraft] = useState('');
  const [mathType, setMathType] = useState<'inline' | 'block'>('inline');
  const openMathRef = useRef<(formula: string, type: 'inline' | 'block', pos: number | null, endPos: number | null) => void>(() => {});
  openMathRef.current = (formula, type, pos, endPos) => {
    setMathModal({ formula, type, pos, endPos });
    setMathDraft(formula);
    setMathType(type);
  };

  type ImageModalState = {
    src: string;
    alt: string;
    title: string;
    width: string;
    height: string;
    pos: number | null;
  };
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);
  const openImageRef = useRef<(attrs: Record<string, unknown>, pos: number | null) => void>(() => {});
  openImageRef.current = (attrs, pos) => {
    setImageModal({
      src: String(attrs.src || ''),
      alt: String(attrs.alt || ''),
      title: String(attrs.title || ''),
      width: String(attrs.width || ''),
      height: String(attrs.height || ''),
      pos,
    });
  };
  const normalizedInitialHtml = useMemo(
    () => normalizeZennHtmlForTiptap(initialHtml || '', markdown),
    [initialHtml, markdown],
  );
  const handleOpenMermaidEditor = useCallback((payload: MermaidEditPayload) => {
    setMermaidModal({ pos: payload.pos, source: payload.source, language: payload.language });
    setMermaidDraft(payload.source);
  }, []);

  const handleNodeClickOn = useCallback(
    (_view: unknown, _pos: number, node: { type: { name: string }; textContent: string; nodeSize: number; attrs: Record<string, unknown> }, nodePos: number) => {
      if (node.type.name === 'inlineMath' || node.type.name === 'blockMath') {
        openMathRef.current(
          node.textContent,
          node.type.name === 'blockMath' ? 'block' : 'inline',
          nodePos,
          nodePos + node.nodeSize,
        );
        return true;
      }
      if (node.type.name === 'image') {
        openImageRef.current(node.attrs, nodePos);
        return true;
      }
      return false;
    },
    [],
  );

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
      // biome-ignore lint/suspicious/noExplicitAny: ProseMirror node type
      handleClickOn: handleNodeClickOn as any,
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

  useEffect(() => {
    if (!mathModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMathModal(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [mathModal]);

  useEffect(() => {
    if (!imageModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImageModal(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [imageModal]);

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
        // biome-ignore lint/suspicious/noExplicitAny: ProseMirror node type
        handleClickOn: handleNodeClickOn as any,
      },
    });
  }, [editor, className, id, ariaLabel, handleNodeClickOn]);

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

  const applyImageChanges = useCallback(() => {
    if (!editor || !imageModal) return;
    const { src, alt, title, width, height, pos } = imageModal;
    if (!src.trim()) return;

    const attrs = {
      src: src.trim(),
      alt: alt.trim(),
      title: title.trim() || null,
      width: /^\d+$/.test(width.trim()) ? width.trim() : null,
      height: /^\d+$/.test(height.trim()) ? height.trim() : null,
      class: 'md-img',
      loading: 'eager',
    };

    if (pos !== null) {
      editor.commands.command(({ state, tr, dispatch }) => {
        const node = state.doc.nodeAt(pos);
        if (!node || node.type.name !== 'image') return false;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        dispatch?.(tr);
        return true;
      });
    } else {
      editor.chain().focus().insertContent({ type: 'image', attrs }).run();
    }

    setImageModal(null);
  }, [editor, imageModal]);

  const mathPreviewHtml = useMemo(() => {
    if (!mathDraft.trim()) return '';
    try {
      return katex.renderToString(mathDraft.trim(), {
        throwOnError: false,
        displayMode: mathType === 'block',
      });
    } catch {
      return '';
    }
  }, [mathDraft, mathType]);

  const applyMathChanges = useCallback(() => {
    if (!editor || !mathModal) return;

    const formula = mathDraft.trim();

    if (mathModal.pos !== null && mathModal.endPos !== null) {
      editor.commands.command(({ state, tr, dispatch }) => {
        const node = state.doc.nodeAt(mathModal.pos!);
        if (!node) return false;
        const contentStart = mathModal.pos! + 1;
        const contentEnd = mathModal.pos! + node.nodeSize - 1;
        if (contentStart < contentEnd) {
          tr.replaceWith(contentStart, contentEnd, formula ? state.schema.text(formula) : []);
        } else if (formula) {
          tr.insert(contentStart, state.schema.text(formula));
        }
        dispatch?.(tr);
        return true;
      });
    } else if (formula) {
      const nodeType = mathType === 'block' ? editor.schema.nodes.blockMath : editor.schema.nodes.inlineMath;
      if (nodeType) {
        editor.chain().focus().insertContent({
          type: nodeType.name,
          content: [{ type: 'text', text: formula }],
        }).run();
      }
    }

    setMathModal(null);
  }, [editor, mathModal, mathDraft, mathType]);

  const applyMermaidChanges = useCallback(() => {
    if (!editor || !mermaidModal) return;

    const nextSource = mermaidDraft.replace(/\r\n?/g, '\n');

    if (mermaidModal.pos !== null) {
      const updated = editor.commands.command(({ state, tr, dispatch }) => {
        const targetNode = state.doc.nodeAt(mermaidModal.pos!);
        if (!targetNode || targetNode.type.name !== 'codeBlock') return false;

        const codeBlockType = state.schema.nodes.codeBlock;
        const nextContent = nextSource ? [state.schema.text(nextSource)] : undefined;
        const nextNode = codeBlockType.create(
          { ...targetNode.attrs, language: targetNode.attrs.language || mermaidModal.language },
          nextContent,
        );
        tr.replaceWith(mermaidModal.pos!, mermaidModal.pos! + targetNode.nodeSize, nextNode);
        dispatch?.(tr);
        return true;
      });
      if (updated) setMermaidModal(null);
    } else {
      editor.chain().focus().insertContent({
        type: 'codeBlock',
        attrs: { language: 'mermaid' },
        content: nextSource ? [{ type: 'text', text: nextSource }] : [],
      }).run();
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
      <div className="tiptap-editor-toolbar">
        <button
          type="button"
          className="tiptap-editor-toolbar__btn"
          title="数式を挿入 (LaTeX)"
          onClick={() => openMathRef.current('', 'inline', null, null)}
        >
          ∑ 数式
        </button>
        <button
          type="button"
          className="tiptap-editor-toolbar__btn"
          title="Mermaid ダイアグラムを挿入"
          onClick={() => { setMermaidModal({ pos: null, source: '', language: 'mermaid' }); setMermaidDraft(''); }}
        >
          ◇ Mermaid
        </button>
        <button
          type="button"
          className="tiptap-editor-toolbar__btn"
          title="画像を挿入"
          onClick={() => openImageRef.current({}, null)}
        >
          🖼 画像
        </button>
      </div>
      {tableToolbar}
      <EditorContent editor={editor} />
        {imageModal && (
        <div
          className="tiptap-mermaid-modal-backdrop"
          role="presentation"
          onClick={() => setImageModal(null)}
        >
          <section
            className="tiptap-image-modal"
            role="dialog"
            aria-modal="true"
            aria-label="画像を挿入"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="tiptap-mermaid-modal__header">
              <h3>画像</h3>
            </header>

            <div className="tiptap-image-modal__fields">
              <label className="tiptap-image-modal__label">
                URL <span aria-hidden="true">*</span>
                <input
                  className="tiptap-image-modal__input"
                  type="url"
                  value={imageModal.src}
                  onChange={(e) => setImageModal((m) => m && { ...m, src: e.target.value })}
                  placeholder="https://example.com/image.png"
                  aria-label="画像 URL"
                  // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
                  autoFocus
                />
              </label>

              <label className="tiptap-image-modal__label">
                代替テキスト (alt)
                <input
                  className="tiptap-image-modal__input"
                  type="text"
                  value={imageModal.alt}
                  onChange={(e) => setImageModal((m) => m && { ...m, alt: e.target.value })}
                  placeholder="画像の説明"
                  aria-label="代替テキスト"
                />
              </label>

              <label className="tiptap-image-modal__label">
                タイトル (任意)
                <input
                  className="tiptap-image-modal__input"
                  type="text"
                  value={imageModal.title}
                  onChange={(e) => setImageModal((m) => m && { ...m, title: e.target.value })}
                  placeholder="ホバー時に表示されるテキスト"
                  aria-label="タイトル"
                />
              </label>

              <div className="tiptap-image-modal__size-row">
                <label className="tiptap-image-modal__label tiptap-image-modal__label--half">
                  幅 (px, 任意)
                  <input
                    className="tiptap-image-modal__input"
                    type="text"
                    inputMode="numeric"
                    value={imageModal.width}
                    onChange={(e) => setImageModal((m) => m && { ...m, width: e.target.value })}
                    placeholder="例: 480"
                    aria-label="幅"
                  />
                </label>
                <label className="tiptap-image-modal__label tiptap-image-modal__label--half">
                  高さ (px, 任意)
                  <input
                    className="tiptap-image-modal__input"
                    type="text"
                    inputMode="numeric"
                    value={imageModal.height}
                    onChange={(e) => setImageModal((m) => m && { ...m, height: e.target.value })}
                    placeholder="例: 320"
                    aria-label="高さ"
                  />
                </label>
              </div>
            </div>

            {imageModal.src.trim() && (
              <div className="tiptap-image-modal__preview">
                <img
                  src={imageModal.src.trim()}
                  alt={imageModal.alt || 'プレビュー'}
                  className="tiptap-image-modal__preview-img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  onLoad={(e) => { (e.target as HTMLImageElement).style.display = ''; }}
                />
              </div>
            )}

            <footer className="tiptap-mermaid-modal__actions">
              <button
                type="button"
                className="tiptap-mermaid-modal__btn tiptap-mermaid-modal__btn--ghost"
                onClick={() => setImageModal(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="tiptap-mermaid-modal__btn"
                onClick={applyImageChanges}
                disabled={!imageModal.src.trim()}
              >
                {imageModal.pos !== null ? '更新' : '挿入'}
              </button>
            </footer>
          </section>
        </div>
      )}
        {mathModal && (
        <div
          className="tiptap-mermaid-modal-backdrop"
          role="presentation"
          onClick={() => setMathModal(null)}
        >
          <section
            className="tiptap-math-modal"
            role="dialog"
            aria-modal="true"
            aria-label="数式を編集"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="tiptap-mermaid-modal__header">
              <h3>数式 (LaTeX)</h3>
              <div className="tiptap-math-modal__type-toggle">
                <button
                  type="button"
                  className={mathType === 'inline' ? 'is-active' : ''}
                  onClick={() => setMathType('inline')}
                >
                  インライン $…$
                </button>
                <button
                  type="button"
                  className={mathType === 'block' ? 'is-active' : ''}
                  onClick={() => setMathType('block')}
                >
                  ブロック $$…$$
                </button>
              </div>
            </header>

            <textarea
              className="tiptap-mermaid-modal__input tiptap-math-modal__input"
              value={mathDraft}
              onChange={(e) => setMathDraft(e.target.value)}
              placeholder="例: \frac{a}{b} = \sqrt{c^2 + d^2}"
              spellCheck={false}
              aria-label="LaTeX 数式"
              // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
              autoFocus
            />

            <div
              className={`tiptap-math-modal__preview${mathPreviewHtml ? '' : ' tiptap-math-modal__preview--empty'}`}
              aria-label="プレビュー"
            >
              {mathPreviewHtml
                ? <span dangerouslySetInnerHTML={{ __html: mathPreviewHtml }} />
                : 'プレビューがここに表示されます'}
            </div>

            <footer className="tiptap-mermaid-modal__actions">
              <button
                type="button"
                className="tiptap-mermaid-modal__btn tiptap-mermaid-modal__btn--ghost"
                onClick={() => setMathModal(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="tiptap-mermaid-modal__btn"
                onClick={applyMathChanges}
                disabled={!mathDraft.trim()}
              >
                {mathModal.pos !== null ? '更新' : '挿入'}
              </button>
            </footer>
          </section>
        </div>
      )}
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
            aria-label="Mermaid ダイアグラムを編集"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="tiptap-mermaid-modal__header">
              <h3>Mermaid ダイアグラム</h3>
            </header>

            <textarea
              className="tiptap-mermaid-modal__input"
              value={mermaidDraft}
              onChange={(event) => setMermaidDraft(event.target.value)}
              placeholder="例: graph TD&#10;  A --> B --> C"
              spellCheck={false}
              aria-label="Mermaid ソース"
              // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
              autoFocus
            />

            <footer className="tiptap-mermaid-modal__actions">
              <button
                type="button"
                className="tiptap-mermaid-modal__btn tiptap-mermaid-modal__btn--ghost"
                onClick={() => setMermaidModal(null)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="tiptap-mermaid-modal__btn"
                onClick={applyMermaidChanges}
                disabled={!mermaidDraft.trim()}
              >
                {mermaidModal.pos !== null ? '更新' : '挿入'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
