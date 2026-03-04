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

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'message'; text: string }
  | { type: 'details'; title: string; text: string }
  | { type: 'card'; url: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language: string; code: string };

type VisualDocument = {
  frontmatter: string;
  blocks: Block[];
};

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

const splitFrontmatter = (markdown: string) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return {
      frontmatter: '',
      body: markdown.trim(),
    };
  }

  return {
    frontmatter: match[1].trim(),
    body: markdown.slice(match[0].length).trim(),
  };
};

const parseMarkdownDocument = (markdown: string): VisualDocument => {
  const { frontmatter, body } = splitFrontmatter(markdown);
  const lines = body ? body.split('\n') : [];
  const blocks: Block[] = [];
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

      blocks.push({
        type: 'code',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    if (line.startsWith(':::message')) {
      const bodyLines: string[] = [];
      index += 1;

      while (index < lines.length && lines[index]?.trim() !== ':::') {
        bodyLines.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: 'message',
        text: bodyLines.join('\n').trim(),
      });
      continue;
    }

    if (line.startsWith(':::details')) {
      const bodyLines: string[] = [];
      const title = line.replace(':::details', '').trim() || 'Details';
      index += 1;

      while (index < lines.length && lines[index]?.trim() !== ':::') {
        bodyLines.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        type: 'details',
        title,
        text: bodyLines.join('\n').trim(),
      });
      continue;
    }

    const cardMatch = line.match(/^@\[card]\((https?:\/\/[^\s)]+)\)$/);
    if (cardMatch) {
      blocks.push({
        type: 'card',
        url: cardMatch[1],
      });
      index += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({
        type: 'heading',
        level: 1,
        text: line.slice(2),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        type: 'heading',
        level: 2,
        text: line.slice(3),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        type: 'heading',
        level: 3,
        text: line.slice(4),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      blocks.push({
        type: 'quote',
        text: line.slice(2),
      });
      index += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];

      while (index < lines.length && lines[index]?.trim().startsWith('- ')) {
        items.push(lines[index]!.trim().slice(2));
        index += 1;
      }

      blocks.push({
        type: 'list',
        items,
      });
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

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join('\n'),
    });
  }

  return {
    frontmatter,
    blocks,
  };
};

const serializeDocument = (document: VisualDocument) => {
  const body = document.blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `${'#'.repeat(block.level)} ${block.text.trim()}`;
        case 'paragraph':
          return block.text.trim();
        case 'message':
          return `:::message\n${block.text.trim()}\n:::`;
        case 'details':
          return `:::details ${block.title.trim()}\n${block.text.trim()}\n:::`;
        case 'card':
          return `@[card](${block.url.trim()})`;
        case 'quote':
          return `> ${block.text.trim()}`;
        case 'list':
          return block.items
            .map((item) => `- ${item.trim()}`)
            .join('\n');
        case 'code':
          return `\`\`\`${block.language.trim()}\n${block.code}\n\`\`\``;
      }
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!document.frontmatter.trim()) {
    return body;
  }

  return `---\n${document.frontmatter.trim()}\n---\n\n${body}`.trim();
};

const createBlock = (type: Block['type']): Block => {
  switch (type) {
    case 'heading':
      return { type: 'heading', level: 2, text: '新しい見出し' };
    case 'paragraph':
      return { type: 'paragraph', text: 'ここに本文を書きます。' };
    case 'message':
      return { type: 'message', text: '補足や注意書きを入力します。' };
    case 'details':
      return { type: 'details', title: '補足情報', text: '折りたたみ中の内容です。' };
    case 'card':
      return { type: 'card', url: 'https://zenn.dev' };
    case 'quote':
      return { type: 'quote', text: '引用文を入力します。' };
    case 'list':
      return { type: 'list', items: ['項目 1', '項目 2'] };
    case 'code':
      return { type: 'code', language: 'ts', code: "export const sample = 'zenn';" };
  }
};

const Tiptap = () => {
  const initialMarkdown = getInitialMarkdown();
  const initialDocument = useMemo(() => parseMarkdownDocument(initialMarkdown), [initialMarkdown]);
  const [visualDocument, setVisualDocument] = useState<VisualDocument>(initialDocument);
  const [editorMarkdown, setEditorMarkdown] = useState(() => serializeDocument(initialDocument));
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Live canvas active');
  const [renderedHtml, setRenderedHtml] = useState('');
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStorage()?.setItem(AUTOSAVE_STORAGE_KEY, editorMarkdown);
  }, [editorMarkdown]);

  useEffect(() => {
    let cancelled = false;
    const options = shouldUseExternalEmbedOrigin()
      ? { embedOrigin: 'https://embed.zenn.studio' as const }
      : undefined;

    void markdownToHtml(editorMarkdown, options)
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
  }, [editorMarkdown]);

  useEffect(() => {
    void import('zenn-embed-elements');
  }, []);

  const commitVisualDocument = (nextDocument: VisualDocument, nextStatus = 'Live canvas updated') => {
    const nextMarkdown = serializeDocument(nextDocument);

    setVisualDocument(nextDocument);
    setEditorMarkdown(nextMarkdown);
    setSaveStatus(nextStatus);
  };

  const loadMarkdownDocument = (markdown: string, nextName: string) => {
    const nextDocument = parseMarkdownDocument(markdown);
    const normalizedMarkdown = serializeDocument(nextDocument);

    setVisualDocument(nextDocument);
    setEditorMarkdown(normalizedMarkdown);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);
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

  const createNewDraft = () => {
    fileHandleRef.current = null;
    loadMarkdownDocument(INITIAL_MARKDOWN, 'untitled.md');
  };

  const downloadDocument = () => {
    const blob = new Blob([editorMarkdown], { type: 'text/markdown;charset=utf-8' });
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
    await writable.write(editorMarkdown);
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

  const updateBlock = (index: number, updater: (block: Block) => Block) => {
    const nextBlocks = visualDocument.blocks.map((block, blockIndex) => {
      if (blockIndex !== index) {
        return block;
      }

      return updater(block);
    });

    commitVisualDocument({ ...visualDocument, blocks: nextBlocks });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= visualDocument.blocks.length) {
      return;
    }

    const nextBlocks = [...visualDocument.blocks];
    const [block] = nextBlocks.splice(index, 1);

    nextBlocks.splice(nextIndex, 0, block);
    commitVisualDocument({ ...visualDocument, blocks: nextBlocks });
  };

  const deleteBlock = (index: number) => {
    const nextBlocks = visualDocument.blocks.filter((_, blockIndex) => blockIndex !== index);
    commitVisualDocument({ ...visualDocument, blocks: nextBlocks }, 'Block removed');
  };

  const appendBlock = (type: Block['type']) => {
    const nextBlocks = [...visualDocument.blocks, createBlock(type)];
    commitVisualDocument({ ...visualDocument, blocks: nextBlocks }, `Added ${type} block`);
  };

  const wordCount = countWords(editorMarkdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <main className="editor-shell">
      <section className="hero-panel">
        <p className="eyebrow">Phase 2: Live WYSIWYG canvas</p>
        <h1>Rich Zenn Editor</h1>
        <p className="hero-copy">
          メインキャンバス自体が表示結果そのものです。見出し、本文、message、details、card を
          表示状態のまま編集し、Markdown は内部形式として保持します。
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
          <span>{visualDocument.blocks.length} blocks</span>
          <span>Markdown synced internally</span>
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
              <h2>Live article canvas</h2>
            </div>
            <div className="toolbar" role="toolbar" aria-label="Block tools">
              <button type="button" onClick={() => appendBlock('paragraph')}>
                + Paragraph
              </button>
              <button type="button" onClick={() => appendBlock('message')}>
                + Message
              </button>
              <button type="button" onClick={() => appendBlock('details')}>
                + Details
              </button>
              <button type="button" onClick={() => appendBlock('card')}>
                + Card
              </button>
            </div>
          </header>

          <div className="editor-surface editor-surface--visual">
            <div className="visual-canvas">
              {visualDocument.blocks.map((block, index) => (
                <article
                  key={`${block.type}-${index}`}
                  className={`visual-block visual-block--${block.type}`}
                >
                  <div className="visual-block__controls">
                    <span className="visual-block__type">{block.type}</span>
                    <div className="visual-block__actions">
                      <button type="button" onClick={() => moveBlock(index, -1)}>
                        Up
                      </button>
                      <button type="button" onClick={() => moveBlock(index, 1)}>
                        Down
                      </button>
                      <button type="button" onClick={() => deleteBlock(index)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {block.type === 'heading' ? (
                    <div className="visual-heading">
                      <select
                        aria-label="Heading level"
                        value={block.level}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            level: Number(event.target.value) as 1 | 2 | 3,
                          }));
                        }}
                      >
                        <option value={1}>H1</option>
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <input
                        aria-label="Heading text"
                        className={`visual-heading__input visual-heading__input--h${block.level}`}
                        value={block.text}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            text: event.target.value,
                          }));
                        }}
                      />
                    </div>
                  ) : null}

                  {block.type === 'paragraph' ? (
                    <textarea
                      aria-label="Paragraph text"
                      className="visual-textarea visual-textarea--plain"
                      value={block.text}
                      onChange={(event) => {
                        updateBlock(index, () => ({
                          ...block,
                          text: event.target.value,
                        }));
                      }}
                    />
                  ) : null}

                  {block.type === 'message' ? (
                    <div className="zenn-message-block">
                      <div className="zenn-message-block__label">message</div>
                      <textarea
                        aria-label="Message body"
                        className="visual-textarea visual-textarea--message"
                        value={block.text}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            text: event.target.value,
                          }));
                        }}
                      />
                    </div>
                  ) : null}

                  {block.type === 'details' ? (
                    <details className="zenn-details-block" open>
                      <summary>
                        <input
                          aria-label="Details title"
                          className="visual-inline-input"
                          value={block.title}
                          onChange={(event) => {
                            updateBlock(index, () => ({
                              ...block,
                              title: event.target.value,
                            }));
                          }}
                        />
                      </summary>
                      <textarea
                        aria-label="Details body"
                        className="visual-textarea visual-textarea--plain"
                        value={block.text}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            text: event.target.value,
                          }));
                        }}
                      />
                    </details>
                  ) : null}

                  {block.type === 'card' ? (
                    <a className="zenn-card-block" href={block.url} target="_blank" rel="noreferrer">
                      <span className="zenn-card-block__eyebrow">link card</span>
                      <input
                        aria-label="Card URL"
                        className="visual-inline-input"
                        value={block.url}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            url: event.target.value,
                          }));
                        }}
                        onClick={(event) => event.preventDefault()}
                      />
                    </a>
                  ) : null}

                  {block.type === 'quote' ? (
                    <blockquote className="visual-quote">
                      <textarea
                        aria-label="Quote text"
                        className="visual-textarea visual-textarea--plain"
                        value={block.text}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            text: event.target.value,
                          }));
                        }}
                      />
                    </blockquote>
                  ) : null}

                  {block.type === 'list' ? (
                    <div className="visual-list">
                      <ul>
                        {block.items.map((item, itemIndex) => (
                          <li key={`${item}-${itemIndex}`}>{item || '...'}</li>
                        ))}
                      </ul>
                      <textarea
                        aria-label="List items"
                        className="visual-textarea visual-textarea--plain"
                        value={block.items.join('\n')}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            items: event.target.value.split('\n'),
                          }));
                        }}
                      />
                    </div>
                  ) : null}

                  {block.type === 'code' ? (
                    <div className="visual-code">
                      <input
                        aria-label="Code language"
                        className="visual-inline-input visual-inline-input--code"
                        value={block.language}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            language: event.target.value,
                          }));
                        }}
                      />
                      <textarea
                        aria-label="Code block"
                        className="visual-textarea visual-textarea--code"
                        value={block.code}
                        onChange={(event) => {
                          updateBlock(index, () => ({
                            ...block,
                            code: event.target.value,
                          }));
                        }}
                      />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="panel preview-panel">
        <header className="panel-header">
          <div>
            <p className="panel-label">Preview</p>
            <h2>zenn-markdown-html render</h2>
          </div>
        </header>

        <div className="preview-toolbar">
          <p className="preview-help">
            この領域は `zenn-markdown-html` と `zenn-content-css` で描画しています。`zenn-cli` の
            プレビューにかなり近い HTML/CSS をそのまま確認できます。
          </p>
        </div>

        <div className="preview-surface">
          <div
            className="preview-surface__content znc"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </section>
    </main>
  );
};

export default Tiptap;
