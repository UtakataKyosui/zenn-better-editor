import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import { INITIAL_MARKDOWN, MARKDOWN_FILE_TYPES } from '../constants/editor';
import { serializeFrontmatter } from '../frontmatter/frontmatter';
import {
  clearRecentFileHandle,
  ensureHandlePermission,
  loadRecentFileHandle,
  saveRecentFileHandle,
} from '../utils/file-system';
import {
  countWords,
  mergeMarkdownParts,
  splitMarkdownParts,
  stripLeadingFrontmatter,
} from '../utils/markdown';
import { validateWithZennModel } from '../utils/zenn-model';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import {
  type BookState,
  loadBookFromDirectory,
  parseBookConfig,
  serializeBookConfig,
} from '../book/book-config';
import { BookSidebar } from '../book/BookSidebar';
import { BookConfigPanel } from '../book/BookConfigPanel';
import { ChapterFrontmatterEditor } from '../book/ChapterFrontmatterEditor';
import { TiptapEditor } from './TiptapEditor';

const shouldUseExternalEmbedOrigin = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return !navigator.userAgent.includes('HappyDOM');
};

const EMBED_ONLY_LINE_PATTERN = /^(@\[[\w-]+\]\(.+\)|https?:\/\/\S+)$/gim;

const getInitialMarkdownByEnvironment = () => {
  if (shouldUseExternalEmbedOrigin()) {
    return INITIAL_MARKDOWN;
  }

  // HappyDOM tests cannot fully handle external iframe/network embeds.
  // Keep syntax visible while preventing embed resolution in test runtime.
  return INITIAL_MARKDOWN.replace(
    EMBED_ONLY_LINE_PATTERN,
    (line) => `\`${line}\``,
  );
};

const createDefaultFrontmatter = (documentName: string) => {
  const baseTitle = documentName.replace(/\.md$/i, '').trim() || 'untitled';

  return serializeFrontmatter({
    title: baseTitle,
    emoji: '📝',
    type: 'tech',
    topics: [],
    published: false,
  });
};

const Tiptap = () => {
  const initialMarkdown = useMemo(() => getInitialMarkdownByEnvironment(), []);
  const initialParts = useMemo(
    () => splitMarkdownParts(initialMarkdown),
    [initialMarkdown],
  );
  const shouldDeferInitialRender = shouldUseExternalEmbedOrigin();
  const [frontmatter, setFrontmatter] = useState(initialParts.frontmatter);
  const [body, setBody] = useState(initialParts.body);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isInitialHtmlReady, setIsInitialHtmlReady] = useState(
    !shouldDeferInitialRender,
  );
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Live markdown editing');
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [bookState, setBookState] = useState<BookState | null>(null);
  const [bookConfigYaml, setBookConfigYaml] = useState('');

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDark]);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitialHtmlResolvedRef = useRef(!shouldDeferInitialRender);

  const markdown = useMemo(() => {
    return mergeMarkdownParts({ frontmatter, body });
  }, [frontmatter, body]);
  const modelValidation = useMemo(
    () =>
      validateWithZennModel({
        frontmatter,
        bodyHtml: renderedHtml,
        documentName,
      }),
    [frontmatter, renderedHtml, documentName],
  );

  const loadMarkdownDocument = (nextMarkdown: string, nextName: string) => {
    const parts = splitMarkdownParts(nextMarkdown);
    const nextFrontmatter = parts.frontmatter.trim()
      ? parts.frontmatter
      : createDefaultFrontmatter(nextName);
    setFrontmatter(nextFrontmatter);
    setBody(parts.body);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);
  };

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const rememberedHandle = await loadRecentFileHandle();
      if (!isMounted || !rememberedHandle) {
        return;
      }

      fileHandleRef.current = rememberedHandle;
      const canRead = await ensureHandlePermission(
        rememberedHandle,
        'read',
        false,
      );
      if (!isMounted) {
        return;
      }

      if (!canRead) {
        setDocumentName(rememberedHandle.name);
        setSaveStatus(`Remembered ${rememberedHandle.name} (Open .md to grant access)`);
        return;
      }

      try {
        const file = await rememberedHandle.getFile();
        const nextMarkdown = await file.text();
        if (!isMounted) {
          return;
        }
        loadMarkdownDocument(nextMarkdown, rememberedHandle.name);
      } catch {
        if (!isMounted) {
          return;
        }
        setSaveStatus(`Failed to load ${rememberedHandle.name}`);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const options = shouldUseExternalEmbedOrigin()
      ? { embedOrigin: 'https://embed.zenn.studio' as const }
      : undefined;

    // WYSIWYG body should never include frontmatter.
    void markdownToHtml(body, options)
      .then((html) => {
        if (!cancelled) {
          setRenderedHtml(html);
          if (!hasInitialHtmlResolvedRef.current) {
            hasInitialHtmlResolvedRef.current = true;
            setIsInitialHtmlReady(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderedHtml('');
          if (!hasInitialHtmlResolvedRef.current) {
            hasInitialHtmlResolvedRef.current = true;
            setIsInitialHtmlReady(true);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [body]);

  useEffect(() => {
    if (shouldUseExternalEmbedOrigin()) {
      bootZennEmbedRuntime();
    }
  }, []);

  const loadFromHandle = async (
    handle: FileSystemFileHandle,
    requestPermission: boolean,
  ) => {
    const canRead = await ensureHandlePermission(
      handle,
      'read',
      requestPermission,
    );
    if (!canRead) {
      setDocumentName(handle.name);
      setSaveStatus(`Open .md to grant access: ${handle.name}`);
      return false;
    }

    try {
      const file = await handle.getFile();
      const nextMarkdown = await file.text();
      fileHandleRef.current = handle;
      await saveRecentFileHandle(handle);
      loadMarkdownDocument(nextMarkdown, handle.name);
      return true;
    } catch {
      setSaveStatus(`Failed to load ${handle.name}`);
      return false;
    }
  };

  const readFile = async (file: File) => {
    fileHandleRef.current = null;
    await clearRecentFileHandle();
    const nextMarkdown = await file.text();
    loadMarkdownDocument(nextMarkdown, file.name);
  };

  const openDocument = async () => {
    if (typeof window.showOpenFilePicker === 'function') {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          excludeAcceptAllOption: false,
          multiple: false,
          types: MARKDOWN_FILE_TYPES,
        });

        if (fileHandle) {
          await loadFromHandle(fileHandle, true);
        }
      } catch {
        // user canceled
      }
      return;
    }

    fileInputRef.current?.click();
  };

  // ── Book mode ──────────────────────────────────────────────────────────

  const CHAPTER_DEFAULT_FRONTMATTER = (num: string) =>
    `title: "チャプター ${num}"`;

  const CHAPTER_DEFAULT_BODY = `# チャプタータイトル\n\nここに本文を書きます。\n`;

  const loadChapter = useCallback(
    async (state: BookState, chapterId: string) => {
      const chapter = state.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;

      const canRead = await ensureHandlePermission(chapter.handle, 'read', true);
      if (!canRead) {
        setSaveStatus(`チャプター ${chapterId} の読み取り権限がありません`);
        return;
      }

      try {
        const file = await chapter.handle.getFile();
        const text = await file.text();
        const parts = splitMarkdownParts(text);
        // Clear stale HTML so the editor doesn't init from the wrong chapter's HTML
        setRenderedHtml('');
        setFrontmatter(parts.frontmatter || CHAPTER_DEFAULT_FRONTMATTER(chapterId));
        setBody(parts.body);
        setDocumentName(chapter.name);
        setSaveStatus(`チャプター ${chapterId} を読み込みました`);
      } catch {
        setSaveStatus(`チャプター ${chapterId} の読み込みに失敗しました`);
      }
    },
    [],
  );

  const openBook = async () => {
    if (bookState) {
      // close book mode
      setBookState(null);
      setBookConfigYaml('');
      loadMarkdownDocument(initialMarkdown, 'untitled.md');
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: File System Access API
    const showDirectoryPicker = (window as any).showDirectoryPicker as
      | ((options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>)
      | undefined;

    if (typeof showDirectoryPicker !== 'function') {
      setSaveStatus('お使いのブラウザはフォルダ選択に対応していません');
      return;
    }

    try {
      const dirHandle = await showDirectoryPicker({ mode: 'readwrite' });
      setSaveStatus('本を読み込み中…');

      const state = await loadBookFromDirectory(dirHandle);
      const configYaml = serializeBookConfig(state.config);

      setBookState(state);
      setBookConfigYaml(configYaml);

      if (state.activeView) {
        await loadChapter(state, state.activeView);
      } else if (state.chapters.length === 0) {
        setSaveStatus(`📚 ${state.slug} を開きました（チャプターなし）`);
      } else {
        setSaveStatus(`📚 ${state.slug} を開きました`);
      }
    } catch (err) {
      // Ignore user-cancel (AbortError), surface real errors
      if (err instanceof Error && err.name !== 'AbortError') {
        setSaveStatus(`本を開けませんでした: ${err.message}`);
      }
    }
  };

  const selectBookView = useCallback(
    async (view: string | null) => {
      if (!bookState) return;

      // Save current chapter before switching
      if (bookState.activeView) {
        const chapter = bookState.chapters.find((c) => c.id === bookState.activeView);
        if (chapter) {
          try {
            const canWrite = await ensureHandlePermission(chapter.handle, 'readwrite', true);
            if (canWrite) {
              const writable = await chapter.handle.createWritable();
              await writable.write(mergeMarkdownParts({ frontmatter, body }));
              await writable.close();
            }
          } catch {
            // ignore save errors when switching
          }
        }
      }

      setBookState((s) => s ? { ...s, activeView: view } : s);

      if (view === null) {
        setSaveStatus('本の設定');
        return;
      }

      await loadChapter(bookState, view);
    },
    [bookState, frontmatter, body, loadChapter],
  );

  const addChapter = useCallback(async () => {
    if (!bookState) return;

    const nextId = String(
      bookState.chapters.length > 0
        ? Math.max(...bookState.chapters.map((c) => Number(c.id))) + 1
        : 1,
    );
    const name = `${nextId}.md`;
    const content = `---\n${CHAPTER_DEFAULT_FRONTMATTER(nextId)}\n---\n\n${CHAPTER_DEFAULT_BODY}`;

    try {
      const canWrite = await ensureHandlePermission(bookState.dirHandle as unknown as FileSystemFileHandle, 'readwrite', true);
      if (!canWrite) return;

      const fileHandle = await bookState.dirHandle.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      const newChapter = {
        id: nextId,
        name,
        handle: fileHandle,
        title: `チャプター ${nextId}`,
      };
      const nextState = {
        ...bookState,
        chapters: [...bookState.chapters, newChapter],
        activeView: nextId,
      };
      setBookState(nextState);
      await loadChapter(nextState, nextId);
    } catch {
      setSaveStatus('チャプターの作成に失敗しました');
    }
  }, [bookState, loadChapter]);

  const saveBookConfig = useCallback(async (yaml: string) => {
    if (!bookState) return;
    setBookConfigYaml(yaml);
    // Update bookState.config so the sidebar title etc. stay in sync
    const newConfig = parseBookConfig(yaml);
    setBookState((s) => s ? { ...s, config: newConfig } : s);
    try {
      const canWrite = await ensureHandlePermission(bookState.dirHandle as unknown as FileSystemFileHandle, 'readwrite', true);
      if (!canWrite) {
        setSaveStatus('config.yaml への書き込み権限がありません');
        return;
      }
      const handle = await bookState.dirHandle.getFileHandle('config.yaml', { create: true });
      const writable = await handle.createWritable();
      await writable.write(yaml);
      await writable.close();
      setSaveStatus('本の設定を保存しました');
    } catch {
      setSaveStatus('config.yaml の保存に失敗しました');
    }
  }, [bookState]);

  // ───────────────────────────────────────────────────────────────────────

  const createNewDraft = () => {
    fileHandleRef.current = null;
    void clearRecentFileHandle();
    loadMarkdownDocument(initialMarkdown, 'untitled.md');
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
    const canWrite = await ensureHandlePermission(handle, 'readwrite', true);
    if (!canWrite) {
      setSaveStatus(`Write permission denied: ${handle.name}`);
      return false;
    }

    try {
      const writable = await handle.createWritable();
      await writable.write(markdown);
      await writable.close();
      fileHandleRef.current = handle;
      await saveRecentFileHandle(handle);
      setDocumentName(handle.name);
      setSaveStatus(`Saved ${handle.name}`);
      return true;
    } catch {
      setSaveStatus(`Failed to save ${handle.name}`);
      return false;
    }
  };

  const saveDocument = async () => {
    // Book mode: save current chapter
    if (bookState?.activeView) {
      const chapter = bookState.chapters.find((c) => c.id === bookState.activeView);
      if (chapter) {
        const canWrite = await ensureHandlePermission(chapter.handle, 'readwrite', true);
        if (canWrite) {
          const writable = await chapter.handle.createWritable();
          await writable.write(mergeMarkdownParts({ frontmatter, body }));
          await writable.close();
          // Update chapter title in state
          const { splitMarkdownParts: smp } = await import('../utils/markdown');
          const parts = smp(mergeMarkdownParts({ frontmatter, body }));
          const titleMatch = parts.frontmatter.match(/^title:\s*(.+)/m);
          const title = titleMatch ? titleMatch[1].replace(/^"|"$/g, '').trim() : chapter.title;
          setBookState((s) =>
            s ? { ...s, chapters: s.chapters.map((c) => c.id === chapter.id ? { ...c, title } : c) } : s,
          );
          setSaveStatus(`チャプター ${chapter.id} を保存しました`);
        }
      }
      return;
    }

    if (modelValidation.criticalCount > 0) {
      const firstCritical = modelValidation.errors.find((error) => error.isCritical);
      const reason = firstCritical?.message || 'zenn-model critical validation errors';
      setSaveStatus(`Cannot save: ${reason}`);
      return;
    }

    if (fileHandleRef.current) {
      await saveToHandle(fileHandleRef.current);
      return;
    }

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: documentName,
          types: MARKDOWN_FILE_TYPES,
        });

        await saveToHandle(handle);
      } catch {
        // user canceled
      }
      return;
    }

    downloadDocument();
  };

  const wordCount = countWords(markdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const activeChapter = bookState?.chapters.find((c) => c.id === bookState.activeView);

  return (
    <div className="app-layout">
      <HeroPanel
        documentName={bookState ? (activeChapter?.name ?? bookState.slug) : documentName}
        saveStatus={saveStatus}
        modelStatus={bookState ? '' : modelValidation.summaryLabel}
        wordCount={wordCount}
        readingMinutes={readingMinutes}
        isDark={isDark}
        isBookMode={!!bookState}
        onCreateNewDraft={createNewDraft}
        onOpenDocument={() => void openDocument()}
        onOpenBook={() => void openBook()}
        onSaveDocument={() => void saveDocument()}
        onDownloadDocument={downloadDocument}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      <main className={`editor-shell${bookState ? ' editor-shell--book' : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = '';
          }}
        />

        {bookState && (
          <BookSidebar
            slug={bookState.slug}
            bookTitle={bookState.config.title}
            chapters={bookState.chapters}
            activeView={bookState.activeView}
            onSelectView={(view) => void selectBookView(view)}
            onAddChapter={() => void addChapter()}
          />
        )}

        <div className={bookState ? 'book-editor-area' : ''}>
          {bookState && bookState.activeView === null ? (
            <div className="panel panel--yaml">
              <BookConfigPanel
                configYaml={bookConfigYaml}
                onChange={(yaml) => void saveBookConfig(yaml)}
              />
            </div>
          ) : bookState && activeChapter ? (
            <div className="workspace-column">
              <section className="panel panel--yaml" aria-label="チャプター設定">
                <ChapterFrontmatterEditor
                  frontmatter={frontmatter}
                  chapterNum={activeChapter.id}
                  onChange={(val) => {
                    setFrontmatter(val);
                    setSaveStatus('編集中…');
                  }}
                />
              </section>
              <section className="panel panel--editor" aria-label="Editor">
                {isInitialHtmlReady ? (
                  <TiptapEditor
                    key={activeChapter.id}
                    id="markdown-editor"
                    className="source-editor source-editor--fused source-editor--wysiwyg znc"
                    ariaLabel="Markdown editor"
                    markdown={body}
                    initialHtml={renderedHtml}
                    onChange={(val) => {
                      setBody(stripLeadingFrontmatter(val));
                      setSaveStatus('編集中…');
                    }}
                  />
                ) : (
                  <div className="editor-loading" aria-live="polite">
                    Preparing editor...
                  </div>
                )}
              </section>
            </div>
          ) : (
            <HybridSurface
              frontmatter={frontmatter}
              body={body}
              renderedHtml={renderedHtml}
              isInitialHtmlReady={isInitialHtmlReady}
              onChangeFrontmatter={(val) => {
                setFrontmatter(val);
                setSaveStatus('Live markdown editing');
              }}
              onChangeBody={(val) => {
                setBody(stripLeadingFrontmatter(val));
                setSaveStatus('Live markdown editing');
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Tiptap;
