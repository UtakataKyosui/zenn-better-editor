import markdownToHtml from 'zenn-markdown-html';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  mode: 'markdown-direct',
  renderer: 'zenn-markdown-html',
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

const shouldUseExternalEmbedOrigin = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return !navigator.userAgent.includes('HappyDOM');
};

const Tiptap = () => {
  const initialMarkdown = useMemo(() => getInitialMarkdown(), []);
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Live markdown editing');
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStorage()?.setItem(AUTOSAVE_STORAGE_KEY, markdown);
  }, [markdown]);

  useEffect(() => {
    let cancelled = false;
    const options = shouldUseExternalEmbedOrigin()
      ? { embedOrigin: 'https://embed.zenn.studio' as const }
      : undefined;

    void markdownToHtml(markdown, options)
      .then((html) => {
        if (!cancelled) {
          setRenderedHtml(html);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderedHtml('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [markdown]);

  useEffect(() => {
    void import('zenn-embed-elements');
  }, []);

  const loadMarkdownDocument = (nextMarkdown: string, nextName: string) => {
    setMarkdown(nextMarkdown);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);
  };

  const readFile = async (file: File) => {
    const nextMarkdown = await file.text();
    loadMarkdownDocument(nextMarkdown, file.name);
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

  const createNewDraft = () => {
    fileHandleRef.current = null;
    loadMarkdownDocument(INITIAL_MARKDOWN, 'untitled.md');
  };

  const downloadDocument = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
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
    await writable.write(markdown);
    await writable.close();
    fileHandleRef.current = handle;
    setDocumentName(handle.name);
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

  const wordCount = countWords(markdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <main className="editor-shell">
      <section className="hero-panel">
        <p className="eyebrow">Phase 2: Markdown-first live preview</p>
        <h1>Rich Zenn Editor</h1>
        <p className="hero-copy">
          左で Markdown を直接入力し、右で `zenn-markdown-html` のレンダリング結果を即時確認します。
          編集対象は Markdown そのものです。
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
          <span>Markdown direct input</span>
          <span>Preview synced live</span>
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
              <p className="panel-label">Editor</p>
              <h2>Markdown editor</h2>
            </div>
          </header>

          <div className="editor-surface editor-surface--visual">
            <div className="fused-canvas">
              <section className="fused-canvas__editor">
                <p className="panel-label">Direct markdown</p>
                <label className="source-label" htmlFor="markdown-editor">
                  Markdown input
                </label>
                <textarea
                  id="markdown-editor"
                  className="source-editor source-editor--fused"
                  value={markdown}
                  onChange={(event) => {
                    setMarkdown(event.target.value);
                    setSaveStatus('Live markdown editing');
                  }}
                  spellCheck={false}
                />
              </section>

              <section className="fused-canvas__render">
                <p className="panel-label">Rendered with zenn-markdown-html</p>
                <div className="preview-surface">
                  <div
                    className="preview-surface__content znc"
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                </div>
              </section>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
};

export default Tiptap;
