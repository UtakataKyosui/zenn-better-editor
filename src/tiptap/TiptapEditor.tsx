import { Mathematics } from '@tiptap/extension-mathematics';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import { EditorToolbar } from './EditorToolbar';
import {
  type MermaidEditPayload,
  MermaidPreview,
} from './extensions/mermaid-preview';
import { ZennShikiCodeHighlight } from './extensions/shiki-code-highlight';
import { ZennCodeBlock } from './extensions/zenn-code-block';
import {
  convertTypedZennContainers,
  ZENN_CONTAINER_CONVERSION_META_KEY,
} from './extensions/zenn-container-transform';
import { ZennDetails, ZennMessage } from './extensions/zenn-containers';
import { ZennEmbedBlock } from './extensions/zenn-embeds';
import {
  convertTypedZennFootnotes,
  ZENN_FOOTNOTE_CONVERSION_META_KEY,
} from './extensions/zenn-footnote-transform';
import {
  ZennFootnoteReference,
  ZennFootnotesSection,
} from './extensions/zenn-footnotes';
import { ZennImage } from './extensions/zenn-image';
import {
  convertTypedZennImages,
  ZENN_IMAGE_CONVERSION_META_KEY,
} from './extensions/zenn-image-transform';
import { ImageModal, type ImageModalState } from './modals/ImageModal';
import { MathModal, type MathModalState } from './modals/MathModal';
import { MermaidModal, type MermaidModalState } from './modals/MermaidModal';
import { TableToolbar } from './TableToolbar';
import { normalizeZennHtmlForTiptap } from './zenn-html';

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
  const [mermaidModal, setMermaidModal] = useState<MermaidModalState | null>(
    null,
  );
  const [mathModal, setMathModal] = useState<MathModalState | null>(null);
  const [imageModal, setImageModal] = useState<ImageModalState | null>(null);

  const openMathRef = useRef<
    (
      formula: string,
      type: 'inline' | 'block',
      pos: number | null,
      endPos: number | null,
    ) => void
  >(() => {});
  openMathRef.current = (formula, type, pos, endPos) => {
    setMathModal({ formula, type, pos, endPos });
  };

  const openImageRef = useRef<
    (attrs: Record<string, unknown>, pos: number | null) => void
  >(() => {});
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
    setMermaidModal({
      pos: payload.pos,
      source: payload.source,
      language: payload.language,
    });
  }, []);

  const handleNodeClickOn = useCallback(
    (
      _view: unknown,
      _pos: number,
      node: {
        type: { name: string };
        textContent: string;
        nodeSize: number;
        attrs: Record<string, unknown>;
      },
      nodePos: number,
    ) => {
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

  // When the editor is created and initialHtml is available, set it once
  useEffect(() => {
    if (!editor || hasInitializedRef.current) return;
    if (normalizedInitialHtml) {
      editor.commands.setContent(normalizedInitialHtml, {
        emitUpdate: false,
      });
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
        editor.commands.setContent(normalizedInitialHtml, {
          emitUpdate: false,
        });
        hasInitializedRef.current = true;
      }
      return;
    }

    const currentMarkdown = editor.getMarkdown();
    if (currentMarkdown !== markdown) {
      if (normalizedInitialHtml) {
        editor.commands.setContent(normalizedInitialHtml, {
          emitUpdate: false,
        });
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

  // ── Modal apply handlers ──

  const applyImageChanges = useCallback(
    (state: ImageModalState) => {
      if (!editor) return;
      const { src, alt, title, width, height, pos } = state;
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
        editor.commands.command(({ state: s, tr, dispatch }) => {
          const node = s.doc.nodeAt(pos);
          if (!node || node.type.name !== 'image') return false;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
          dispatch?.(tr);
          return true;
        });
      } else {
        editor.chain().focus().insertContent({ type: 'image', attrs }).run();
      }

      setImageModal(null);
    },
    [editor],
  );

  const applyMathChanges = useCallback(
    (formula: string, type: 'inline' | 'block', state: MathModalState) => {
      if (!editor) return;
      const trimmedFormula = formula.trim();

      if (state.pos !== null && state.endPos !== null) {
        const pos = state.pos;
        editor.commands.command(({ state: s, tr, dispatch }) => {
          const node = s.doc.nodeAt(pos);
          if (!node) return false;
          const contentStart = pos + 1;
          const contentEnd = pos + node.nodeSize - 1;
          if (contentStart < contentEnd) {
            tr.replaceWith(
              contentStart,
              contentEnd,
              trimmedFormula ? s.schema.text(trimmedFormula) : [],
            );
          } else if (trimmedFormula) {
            tr.insert(contentStart, s.schema.text(trimmedFormula));
          }
          dispatch?.(tr);
          return true;
        });
      } else if (trimmedFormula) {
        const nodeType =
          type === 'block'
            ? editor.schema.nodes.blockMath
            : editor.schema.nodes.inlineMath;
        if (nodeType) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: nodeType.name,
              content: [{ type: 'text', text: trimmedFormula }],
            })
            .run();
        }
      }

      setMathModal(null);
    },
    [editor],
  );

  const applyMermaidChanges = useCallback(
    (source: string, state: MermaidModalState) => {
      if (!editor) return;
      const nextSource = source.replace(/\r\n?/g, '\n');

      if (state.pos !== null) {
        const pos = state.pos;
        const updated = editor.commands.command(
          ({ state: s, tr, dispatch }) => {
            const targetNode = s.doc.nodeAt(pos);
            if (!targetNode || targetNode.type.name !== 'codeBlock')
              return false;

            const codeBlockType = s.schema.nodes.codeBlock;
            const nextContent = nextSource
              ? [s.schema.text(nextSource)]
              : undefined;
            const nextNode = codeBlockType.create(
              {
                ...targetNode.attrs,
                language: targetNode.attrs.language || state.language,
              },
              nextContent,
            );
            tr.replaceWith(pos, pos + targetNode.nodeSize, nextNode);
            dispatch?.(tr);
            return true;
          },
        );
        if (updated) setMermaidModal(null);
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: nextSource ? [{ type: 'text', text: nextSource }] : [],
          })
          .run();
        setMermaidModal(null);
      }
    },
    [editor],
  );

  return (
    <div
      className="tiptap-scroll-container"
      onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
    >
      <EditorToolbar
        onInsertMath={() => openMathRef.current('', 'inline', null, null)}
        onInsertMermaid={() =>
          setMermaidModal({ pos: null, source: '', language: 'mermaid' })
        }
        onInsertImage={() => openImageRef.current({}, null)}
      />
      {isInTable && editor ? <TableToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />

      {imageModal && (
        <ImageModal
          state={imageModal}
          onClose={() => setImageModal(null)}
          onApply={applyImageChanges}
        />
      )}

      {mathModal && (
        <MathModal
          state={mathModal}
          onClose={() => setMathModal(null)}
          onApply={applyMathChanges}
        />
      )}

      {mermaidModal && (
        <MermaidModal
          state={mermaidModal}
          onClose={() => setMermaidModal(null)}
          onApply={applyMermaidChanges}
        />
      )}
    </div>
  );
};
