import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

const INITIAL_MARKDOWN = `---
title: "Zenn article draft"
emoji: "📝"
type: "tech"
topics:
  - editor
  - zenn
published: false
---

# Zenn 向けの下書き

WYSIWYG で編集しながら、Markdown を壊さずに持てる構成です。

## 書きたいこと

- 見出し
- 箇条書き
- コードブロック

\`\`\`ts
export const hello = 'zenn';
\`\`\`
`;

const ZENN_SNIPPETS = [
  {
    label: 'Message',
    snippet: `
:::message
読者に伝えたい補足を書きます。
:::
`.trim(),
  },
  {
    label: 'Details',
    snippet: `
:::details 補足情報
ここに折りたたみコンテンツを書きます。
:::
`.trim(),
  },
  {
    label: 'Link Card',
    snippet: '@[card](https://zenn.dev)',
  },
];

const countWords = (value: string) => {
  const normalized = value
    .replace(/^---[\s\S]*?---/m, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
};

const Tiptap = () => {
  const [editorMarkdown, setEditorMarkdown] = useState(INITIAL_MARKDOWN);
  const [sourceMarkdown, setSourceMarkdown] = useState(INITIAL_MARKDOWN);
  const [isSourceDirty, setIsSourceDirty] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const sourceDirtyRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: INITIAL_MARKDOWN,
    contentType: 'markdown',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'editor-surface__content',
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const syncFromEditor = () => {
      const nextMarkdown = editor.getMarkdown();
      const nextSelection = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' ',
      );

      setEditorMarkdown(nextMarkdown);
      setSelectionText(nextSelection);

      if (!sourceDirtyRef.current) {
        setSourceMarkdown(nextMarkdown);
      }
    };

    syncFromEditor();
    editor.on('update', syncFromEditor);
    editor.on('selectionUpdate', syncFromEditor);

    return () => {
      editor.off('update', syncFromEditor);
      editor.off('selectionUpdate', syncFromEditor);
    };
  }, [editor]);

  const applySourceToEditor = () => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(sourceMarkdown, {
      contentType: 'markdown',
    });
    sourceDirtyRef.current = false;
    setIsSourceDirty(false);
  };

  const resetSource = () => {
    sourceDirtyRef.current = false;
    setIsSourceDirty(false);
    setSourceMarkdown(editorMarkdown);
  };

  const updateSource = (value: string) => {
    sourceDirtyRef.current = value !== editorMarkdown;
    setIsSourceDirty(sourceDirtyRef.current);
    setSourceMarkdown(value);
  };

  const insertSnippet = (snippet: string) => {
    const next = `${sourceMarkdown.trimEnd()}\n\n${snippet}\n`;
    updateSource(next);
  };

  const wordCount = countWords(editorMarkdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <main className="editor-shell">
      <section className="hero-panel">
        <p className="eyebrow">Phase 1: Markdown-first editing core</p>
        <h1>Rich Zenn Editor</h1>
        <p className="hero-copy">
          Zenn の Markdown を保ったまま編集できる土台です。左でリッチテキスト、
          右で生の Markdown を管理し、次の段階で zenn-cli プレビューを接続しやすい構成にしています。
        </p>
        <div className="status-strip" aria-label="editor status">
          <span>{wordCount} words</span>
          <span>{readingMinutes} min read</span>
          <span>{selectionText ? `Selection: ${selectionText.length} chars` : 'Selection: none'}</span>
          <span>{isSourceDirty ? 'Source differs from editor' : 'Source is in sync'}</span>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <p className="panel-label">Visual editor</p>
              <h2>WYSIWYG canvas</h2>
            </div>
            <div className="toolbar" role="toolbar" aria-label="Formatting tools">
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor}
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor}
              >
                Italic
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                disabled={!editor}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                disabled={!editor}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                disabled={!editor}
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                disabled={!editor}
              >
                Code
              </button>
            </div>
          </header>

          <div className="editor-surface">
            <EditorContent editor={editor} />
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <p className="panel-label">Markdown source</p>
              <h2>Zenn-safe output</h2>
            </div>
            <div className="source-actions">
              <button type="button" onClick={applySourceToEditor} disabled={!editor || !isSourceDirty}>
                Apply to editor
              </button>
              <button type="button" onClick={resetSource} disabled={!isSourceDirty}>
                Reset
              </button>
            </div>
          </header>

          <div className="snippet-bar" aria-label="Zenn snippets">
            {ZENN_SNIPPETS.map((item) => (
              <button key={item.label} type="button" onClick={() => insertSnippet(item.snippet)}>
                + {item.label}
              </button>
            ))}
          </div>

          <label className="source-label" htmlFor="markdown-source">
            Current article markdown
          </label>
          <textarea
            id="markdown-source"
            className="source-editor"
            value={sourceMarkdown}
            onChange={(event) => updateSource(event.target.value)}
            spellCheck={false}
          />
        </section>
      </section>
    </main>
  );
};

export default Tiptap;
