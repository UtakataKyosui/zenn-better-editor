import { useEffect, useMemo, useRef, useState } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import {
  AUTOSAVE_STORAGE_KEY,
  INITIAL_MARKDOWN,
  MARKDOWN_FILE_TYPES,
} from '../constants/editor';
import {
  countWords,
  mergeMarkdownParts,
  splitMarkdownParts,
} from '../utils/markdown';

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
  const initialParts = useMemo(
    () => splitMarkdownParts(initialMarkdown),
    [initialMarkdown],
  );
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
    const parts = splitMarkdownParts(nextMarkdown);
    setFrontmatter(parts.frontmatter);
    setBody(parts.body);
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
      <HeroPanel
        documentName={documentName}
        saveStatus={saveStatus}
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
          setBody(val);
          setSaveStatus('Live markdown editing');
        }}
      />
    </main>
  );
};

export default Tiptap;
