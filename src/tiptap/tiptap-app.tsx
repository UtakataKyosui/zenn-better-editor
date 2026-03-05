import { useEffect, useMemo, useRef, useState } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import { INITIAL_MARKDOWN, MARKDOWN_FILE_TYPES } from '../constants/editor';
import { serializeFrontmatter } from '../utils/frontmatter';
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

const shouldUseExternalEmbedOrigin = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return !navigator.userAgent.includes('HappyDOM');
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
  const initialParts = useMemo(() => splitMarkdownParts(INITIAL_MARKDOWN), []);
  const [frontmatter, setFrontmatter] = useState(initialParts.frontmatter);
  const [body, setBody] = useState(initialParts.body);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Live markdown editing');
  const [isSeamless, setIsSeamless] = useState(true);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  }, [body]);

  useEffect(() => {
    void import('zenn-embed-elements');
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

  const createNewDraft = () => {
    fileHandleRef.current = null;
    void clearRecentFileHandle();
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

  return (
    <main className="editor-shell">
      <HeroPanel
        documentName={documentName}
        saveStatus={saveStatus}
        modelStatus={modelValidation.summaryLabel}
        wordCount={wordCount}
        readingMinutes={readingMinutes}
        onCreateNewDraft={createNewDraft}
        onOpenDocument={() => void openDocument()}
        onSaveDocument={() => void saveDocument()}
        onDownloadDocument={downloadDocument}
      />

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

      <HybridSurface
        frontmatter={frontmatter}
        body={body}
        renderedHtml={renderedHtml}
        isSeamless={isSeamless}
        onToggleSeamless={() => setIsSeamless((prev) => !prev)}
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
  );
};

export default Tiptap;
