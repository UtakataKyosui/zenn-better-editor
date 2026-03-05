import { useEffect, useMemo, useRef, useState } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import { INITIAL_MARKDOWN, MARKDOWN_FILE_TYPES } from '../constants/editor';
import {
  countWords,
  mergeMarkdownParts,
  splitMarkdownParts,
  stripLeadingFrontmatter,
} from '../utils/markdown';

const DRAFT_FILE_NAME = 'rich-zenn-editor-draft.md';

const getDraftDirectory = async () => {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.storage?.getDirectory !== 'function'
  ) {
    return null;
  }

  try {
    return await navigator.storage.getDirectory();
  } catch {
    return null;
  }
};

const readDraftFromFileSystem = async () => {
  const directory = await getDraftDirectory();
  if (!directory) {
    return null;
  }

  try {
    const fileHandle = await directory.getFileHandle(DRAFT_FILE_NAME);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
};

const writeDraftToFileSystem = async (markdown: string) => {
  const directory = await getDraftDirectory();
  if (!directory) {
    return;
  }

  try {
    const fileHandle = await directory.getFileHandle(DRAFT_FILE_NAME, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(markdown);
    await writable.close();
  } catch {
    // ignore write errors; manual save/open still works
  }
};

const shouldUseExternalEmbedOrigin = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return !navigator.userAgent.includes('HappyDOM');
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

  const loadMarkdownDocument = (nextMarkdown: string, nextName: string) => {
    const parts = splitMarkdownParts(nextMarkdown);
    setFrontmatter(parts.frontmatter);
    setBody(parts.body);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);
  };

  useEffect(() => {
    let cancelled = false;

    void readDraftFromFileSystem().then((savedDraft) => {
      if (cancelled || !savedDraft) return;
      loadMarkdownDocument(savedDraft, DRAFT_FILE_NAME);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void writeDraftToFileSystem(markdown);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [markdown]);

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
          setBody(stripLeadingFrontmatter(val));
          setSaveStatus('Live markdown editing');
        }}
      />
    </main>
  );
};

export default Tiptap;
