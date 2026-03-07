import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { ArticlesSidebar } from '../components/ArticlesSidebar';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import { NewArticleModal } from '../components/NewArticleModal';
import { INITIAL_MARKDOWN } from '../constants/editor';
import type { ZennFrontmatter } from '../frontmatter/frontmatter';
import {
  parseFrontmatter,
  serializeFrontmatter,
} from '../frontmatter/frontmatter';
import {
  clearRecentFileHandle,
  ensureHandlePermission,
  listMarkdownFiles,
  loadRecentDirectoryHandle,
  loadRecentFileHandle,
  openArticlesDirectory,
  readFileFromDirectory,
  saveFileToDirectory,
  saveRecentDirectoryHandle,
  saveRecentFileHandle,
} from '../utils/file-system';
import {
  countWords,
  mergeMarkdownParts,
  splitMarkdownParts,
  stripLeadingFrontmatter,
} from '../utils/markdown';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import { validateWithZennModel } from '../utils/zenn-model';

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

  // ── Articles sidebar state ──
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [articleFiles, setArticleFiles] = useState<string[]>([]);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  // ── New article modal state ──
  const [newArticleModalOpen, setNewArticleModalOpen] = useState(false);

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    // shadcn/ui uses .dark class; zenn-content-css uses [data-theme^=dark]
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    localStorage.setItem('theme', theme);
  }, [isDark]);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
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
        setSaveStatus(
          `Remembered ${rememberedHandle.name} (Open .md to grant access)`,
        );
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

  // Restore remembered directory handle on mount
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const rememberedDir = await loadRecentDirectoryHandle();
      if (!isMounted || !rememberedDir) {
        return;
      }

      dirHandleRef.current = rememberedDir;

      try {
        const files = await listMarkdownFiles(rememberedDir);
        if (!isMounted) return;
        setArticleFiles(files);
        setSidebarOpen(true);
      } catch {
        // permission not yet granted - that's ok
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

  const createNewDraft = () => {
    if (dirHandleRef.current) {
      // Directory is open -> open the modal for new article creation
      setNewArticleModalOpen(true);
      return;
    }
    fileHandleRef.current = null;
    setActiveArticle(null);
    void clearRecentFileHandle();
    loadMarkdownDocument(initialMarkdown, 'untitled.md');
  };

  // ── Directory sidebar handlers ──
  const handleOpenDirectory = async () => {
    const dirHandle = await openArticlesDirectory();
    if (!dirHandle) return;

    dirHandleRef.current = dirHandle;
    await saveRecentDirectoryHandle(dirHandle);
    const files = await listMarkdownFiles(dirHandle);
    setArticleFiles(files);
    setSidebarOpen(true);
    setActiveArticle(null);
  };

  const handleRefreshFiles = async () => {
    if (!dirHandleRef.current) return;
    const files = await listMarkdownFiles(dirHandleRef.current);
    setArticleFiles(files);
  };

  const handleSelectFile = async (fileName: string) => {
    if (!dirHandleRef.current) return;

    const content = await readFileFromDirectory(
      dirHandleRef.current,
      fileName,
    );
    if (content === null) {
      setSaveStatus(`Failed to read ${fileName}`);
      return;
    }

    fileHandleRef.current = null;
    setActiveArticle(fileName);
    loadMarkdownDocument(content, fileName);
  };

  const handleCreateNewArticle = useCallback(
    async (fm: ZennFrontmatter) => {
      if (!dirHandleRef.current) return;

      // Generate a random slug for Zenn articles
      const slug = crypto.randomUUID().slice(0, 20).replace(/-/g, '');
      const fileName = `${slug}.md`;

      const defaultContent = `---\n${serializeFrontmatter(fm)}\n---\n\n`;

      const saved = await saveFileToDirectory(
        dirHandleRef.current,
        fileName,
        defaultContent,
      );

      if (!saved) {
        setSaveStatus(`Failed to create ${fileName}`);
        return;
      }

      // Refresh file list and select the new file
      const files = await listMarkdownFiles(dirHandleRef.current);
      setArticleFiles(files);
      setActiveArticle(fileName);
      fileHandleRef.current = null;
      loadMarkdownDocument(defaultContent, fileName);
      setSaveStatus(`Created ${fileName}`);
      setNewArticleModalOpen(false);
    },
    [],
  );


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
    if (modelValidation.criticalCount > 0) {
      const firstCritical = modelValidation.errors.find(
        (error) => error.isCritical,
      );
      const reason =
        firstCritical?.message || 'zenn-model critical validation errors';
      setSaveStatus(`Cannot save: ${reason}`);
      return;
    }

    // Guard: confirm before overwriting a published article
    const parsed = parseFrontmatter(frontmatter);
    if (parsed.published) {
      const confirmed = window.confirm(
        `「${parsed.title || documentName}」は公開済みの記事です。\n保存すると公開内容が更新されます。続行しますか？`,
      );
      if (!confirmed) {
        setSaveStatus('Save cancelled');
        return;
      }
    }

    if (fileHandleRef.current) {
      await saveToHandle(fileHandleRef.current);
      return;
    }

    // Save to directory file if opened from sidebar
    if (dirHandleRef.current && activeArticle) {
      const saved = await saveFileToDirectory(
        dirHandleRef.current,
        activeArticle,
        markdown,
      );
      if (saved) {
        setSaveStatus(`Saved ${activeArticle}`);
      } else {
        setSaveStatus(`Failed to save ${activeArticle}`);
      }
      return;
    }

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: documentName,
          types: [
            {
              description: 'Markdown files',
              accept: { 'text/markdown': ['.md'], 'text/plain': ['.md'] },
            },
          ],
        });

        await saveToHandle(handle);
      } catch {
        // user canceled
      }
    }
  };

  const wordCount = countWords(markdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="app-layout">
      <HeroPanel
        documentName={documentName}
        saveStatus={saveStatus}
        modelStatus={modelValidation.summaryLabel}
        wordCount={wordCount}
        readingMinutes={readingMinutes}
        isDark={isDark}
        onCreateNewDraft={createNewDraft}
        onSaveDocument={() => void saveDocument()}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      <div className="app-body">
        <ArticlesSidebar
          isOpen={sidebarOpen}
          files={articleFiles}
          activeFile={activeArticle}
          directoryName={dirHandleRef.current?.name ?? null}
          onToggle={() => setSidebarOpen((o) => !o)}
          onOpenDirectory={() => void handleOpenDirectory()}
          onRefresh={() => void handleRefreshFiles()}
          onSelectFile={(f) => void handleSelectFile(f)}
          onCreateNewArticle={() => setNewArticleModalOpen(true)}
        />

        <main className="editor-shell">
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
        </main>
      </div>

      <NewArticleModal
        open={newArticleModalOpen}
        onOpenChange={setNewArticleModalOpen}
        onSubmit={(fm) => void handleCreateNewArticle(fm)}
      />
    </div>
  );
};

export default Tiptap;
