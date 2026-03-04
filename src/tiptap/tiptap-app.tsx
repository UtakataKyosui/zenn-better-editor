import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useDeferredValue, useEffect, useRef, useState } from 'react';

const AUTOSAVE_STORAGE_KEY = 'rich-zenn-editor:draft';

const INITIAL_MARKDOWN = `---
title: "Rich Zenn Editor preview demo"
emoji: "📚"
type: "tech"
topics:
  - editor
  - zenn
  - preview
published: false
---

# ローカルプレビュー確認用のサンプル

起動直後に Zenn 記法の見え方を確認できるよう、主要なブロックを最初から配置しています。

:::message
このブロックは Zenn の message 記法です。注意書きや補足に使います。
:::

## 箇条書き

- 見出しの表示
- リストの表示
- コードブロックの表示

:::details ローカルプレビューで開いて確認
details 記法の見え方をここで確認できます。あとで折りたたみ挙動も強化できます。
:::

@[card](https://zenn.dev/zenn/articles/markdown-guide)

> 引用ブロックも同時に確認できます。

\`\`\`ts
export const previewTarget = {
  mode: 'local',
  supports: ['message', 'details', 'card'],
};
\`\`\`
`;

const MARKDOWN_FILE_TYPES = [
  {
    description: 'Markdown files',
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.md'],
    },
  },
];

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

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const renderInlineMarkdown = (value: string) => {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
};

const renderParagraph = (value: string) => {
  return `<p>${renderInlineMarkdown(value)}</p>`;
};

const renderZennPreview = (markdown: string) => {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n?/m, '').trim();
  const lines = withoutFrontmatter.split('\n');
  const chunks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index] ?? '';
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index]?.trim().startsWith('```')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      const code = escapeHtml(codeLines.join('\n'));
      chunks.push(
        `<pre class="zenn-code-block"><code data-language="${escapeHtml(language)}">${code}</code></pre>`,
      );
      continue;
    }

    if (line.startsWith(':::message')) {
      const body: string[] = [];
      index += 1;

      while (index < lines.length && lines[index]?.trim() !== ':::') {
        body.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      chunks.push(`
        <aside class="zenn-message-block">
          <div class="zenn-message-block__label">message</div>
          <div>${renderParagraph(body.join(' ').trim())}</div>
        </aside>
      `);
      continue;
    }

    if (line.startsWith(':::details')) {
      const title = line.replace(':::details', '').trim() || 'Details';
      const body: string[] = [];
      index += 1;

      while (index < lines.length && lines[index]?.trim() !== ':::') {
        body.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      chunks.push(`
        <details class="zenn-details-block" open>
          <summary>${renderInlineMarkdown(title)}</summary>
          ${renderParagraph(body.join(' ').trim())}
        </details>
      `);
      continue;
    }

    const cardMatch = line.match(/^@\[card]\((https?:\/\/[^\s)]+)\)$/);
    if (cardMatch) {
      const url = cardMatch[1];
      chunks.push(`
        <a class="zenn-card-block" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
          <span class="zenn-card-block__eyebrow">link card</span>
          <strong>${escapeHtml(url.replace(/^https?:\/\//, ''))}</strong>
          <span>${escapeHtml(url)}</span>
        </a>
      `);
      index += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      chunks.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      chunks.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      chunks.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      chunks.push(`<blockquote>${renderParagraph(line.slice(2))}</blockquote>`);
      index += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];

      while (index < lines.length && lines[index]?.trim().startsWith('- ')) {
        items.push(`<li>${renderInlineMarkdown(lines[index]!.trim().slice(2))}</li>`);
        index += 1;
      }

      chunks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const paragraphLines = [line];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index]?.trim() ?? '';

      if (
        !nextLine ||
        nextLine.startsWith('#') ||
        nextLine.startsWith('- ') ||
        nextLine.startsWith('> ') ||
        nextLine.startsWith('```') ||
        nextLine.startsWith(':::') ||
        nextLine.startsWith('@[card]')
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    chunks.push(renderParagraph(paragraphLines.join(' ')));
  }

  return chunks.join('');
};

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const { localStorage } = window;

  if (
    typeof localStorage?.getItem !== 'function' ||
    typeof localStorage?.setItem !== 'function'
  ) {
    return null;
  }

  return localStorage;
};

const getInitialMarkdown = () => {
  return getStorage()?.getItem(AUTOSAVE_STORAGE_KEY) ?? INITIAL_MARKDOWN;
};

const Tiptap = () => {
  const initialMarkdown = getInitialMarkdown();
  const [editorMarkdown, setEditorMarkdown] = useState(initialMarkdown);
  const [sourceMarkdown, setSourceMarkdown] = useState(initialMarkdown);
  const [isSourceDirty, setIsSourceDirty] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Local draft active');
  const [previewMode, setPreviewMode] = useState<'local' | 'iframe'>('local');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:8000');
  const sourceDirtyRef = useRef(false);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deferredSourceMarkdown = useDeferredValue(sourceMarkdown);
  const previewHtml = renderZennPreview(deferredSourceMarkdown);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialMarkdown,
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

  useEffect(() => {
    getStorage()?.setItem(AUTOSAVE_STORAGE_KEY, sourceMarkdown);
  }, [sourceMarkdown]);

  const loadMarkdownDocument = (markdown: string, nextName: string) => {
    sourceDirtyRef.current = false;
    setIsSourceDirty(false);
    setSourceMarkdown(markdown);
    setEditorMarkdown(markdown);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);

    if (editor) {
      editor.commands.setContent(markdown, {
        contentType: 'markdown',
      });
    }
  };

  const readFile = async (file: File) => {
    const markdown = await file.text();
    loadMarkdownDocument(markdown, file.name);
  };

  const openDocument = async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      const [fileHandle] = await window.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: MARKDOWN_FILE_TYPES,
      });

      fileHandleRef.current = fileHandle;
      const file = await fileHandle.getFile();
      await readFile(file);
      return;
    }

    fileInputRef.current?.click();
  };

  const applySourceToEditor = () => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(sourceMarkdown, {
      contentType: 'markdown',
    });
    sourceDirtyRef.current = false;
    setIsSourceDirty(false);
    setSaveStatus('Applied source to editor');
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
    setSaveStatus(sourceDirtyRef.current ? 'Unsaved changes' : 'Local draft active');
  };

  const insertSnippet = (snippet: string) => {
    const next = `${sourceMarkdown.trimEnd()}\n\n${snippet}\n`;
    updateSource(next);
  };

  const createNewDraft = () => {
    fileHandleRef.current = null;
    loadMarkdownDocument(INITIAL_MARKDOWN, 'untitled.md');
  };

  const downloadDocument = () => {
    const blob = new Blob([sourceMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = documentName;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveStatus(`Downloaded ${documentName}`);
  };

  const saveToHandle = async (handle: FileSystemFileHandle) => {
    const writable = await handle.createWritable();
    await writable.write(sourceMarkdown);
    await writable.close();
    fileHandleRef.current = handle;
    setDocumentName(handle.name);
    sourceDirtyRef.current = false;
    setIsSourceDirty(false);
    setSaveStatus(`Saved ${handle.name}`);
  };

  const saveDocument = async () => {
    if (fileHandleRef.current) {
      await saveToHandle(fileHandleRef.current);
      return;
    }

    if (typeof window.showSaveFilePicker === 'function') {
      const handle = await window.showSaveFilePicker({
        suggestedName: documentName,
        types: MARKDOWN_FILE_TYPES,
      });

      await saveToHandle(handle);
      return;
    }

    downloadDocument();
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
        <div className="file-strip" aria-label="document controls">
          <button type="button" onClick={createNewDraft}>
            New draft
          </button>
          <button type="button" onClick={() => void openDocument()}>
            Open .md
          </button>
          <button type="button" onClick={() => void saveDocument()}>
            Save
          </button>
          <button type="button" onClick={downloadDocument}>
            Download copy
          </button>
          <span className="document-meta">{documentName}</span>
          <span className="document-meta">{saveStatus}</span>
        </div>
        <div className="status-strip" aria-label="editor status">
          <span>{wordCount} words</span>
          <span>{readingMinutes} min read</span>
          <span>{selectionText ? `Selection: ${selectionText.length} chars` : 'Selection: none'}</span>
          <span>{isSourceDirty ? 'Source differs from editor' : 'Source is in sync'}</span>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown,text/plain"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void readFile(file);
          }

          event.target.value = '';
        }}
      />

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

      <section className="panel preview-panel">
        <header className="panel-header">
          <div>
            <p className="panel-label">Preview</p>
            <h2>zenn-cli bridge</h2>
          </div>
          <div className="preview-toggle" role="tablist" aria-label="Preview mode">
            <button
              type="button"
              className={previewMode === 'local' ? 'is-active' : undefined}
              onClick={() => setPreviewMode('local')}
              aria-pressed={previewMode === 'local'}
            >
              Local preview
            </button>
            <button
              type="button"
              className={previewMode === 'iframe' ? 'is-active' : undefined}
              onClick={() => setPreviewMode('iframe')}
              aria-pressed={previewMode === 'iframe'}
            >
              zenn-cli iframe
            </button>
          </div>
        </header>

        <div className="preview-toolbar">
          <label className="preview-url-field" htmlFor="preview-url">
            <span>Preview URL</span>
            <input
              id="preview-url"
              type="url"
              value={previewUrl}
              onChange={(event) => setPreviewUrl(event.target.value)}
              placeholder="http://localhost:8000"
            />
          </label>
          <p className="preview-help">
            `zenn preview` を別プロセスで起動したら、その URL をここに設定します。
            それまではローカルプレビューで構造確認できます。
          </p>
        </div>

        {previewMode === 'iframe' ? (
          <div className="preview-frame-shell">
            {previewUrl.trim() ? (
              <iframe
                className="preview-frame"
                title="zenn-cli preview"
                src={previewUrl}
              />
            ) : (
              <div className="preview-empty">
                <p>プレビュー URL を入力すると iframe で zenn-cli の画面を表示します。</p>
              </div>
            )}
          </div>
        ) : (
          <div className="preview-surface">
            <div className="preview-surface__content prose prose-slate">
              {isSourceDirty ? (
                <div className="preview-warning">
                  ローカルプレビューは Markdown ソースを直接描画しています。WYSIWYG 側へ反映するには `Apply to editor` を使います。
                </div>
              ) : null}
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Tiptap;
