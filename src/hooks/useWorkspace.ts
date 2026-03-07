import { useState, useRef, useEffect, useCallback } from 'react';
import type { ZennFrontmatter } from '../frontmatter/frontmatter';
import { parseFrontmatter, serializeFrontmatter } from '../frontmatter/frontmatter';
import {
  clearRecentFileHandle,
  ensureHandlePermission,
  listMarkdownFiles,
  loadRecentDirectoryHandle,
  loadRecentFileHandle,
  openArticlesDirectory,
  readFileFromDirectory,
  saveFileToDirectory,
  deleteFileFromDirectory,
  saveRecentDirectoryHandle,
  saveRecentFileHandle,
} from '../utils/file-system';

type UseWorkspaceProps = {
  markdown: string;
  documentName: string;
  initialMarkdown: string;
  frontmatter: string;
  modelValidation: { criticalCount: number; errors: { isCritical?: boolean; message: string }[] };
  loadMarkdownDocument: (nextMarkdown: string, nextName: string) => void;
  setSaveStatus: (status: string) => void;
  setDocumentName: (name: string) => void;
};

export const useWorkspace = ({
  markdown,
  documentName,
  initialMarkdown,
  frontmatter,
  modelValidation,
  loadMarkdownDocument,
  setSaveStatus,
  setDocumentName,
}: UseWorkspaceProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [articleFiles, setArticleFiles] = useState<string[]>([]);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  // Restore remembered file handle on mount
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  const createNewDraft = (setNewArticleModalOpen: (open: boolean) => void) => {
    if (dirHandleRef.current) {
      setNewArticleModalOpen(true);
      return;
    }
    fileHandleRef.current = null;
    setActiveArticle(null);
    void clearRecentFileHandle();
    loadMarkdownDocument(initialMarkdown, 'untitled.md');
  };

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
    async (slug: string, fm: ZennFrontmatter, closeDialog: () => void) => {
      if (!dirHandleRef.current) return;

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
      closeDialog();
    },
    [loadMarkdownDocument, setSaveStatus],
  );

  const handleDeleteArticle = useCallback(
    async (fileName: string) => {
      if (!dirHandleRef.current) return;

      const deleted = await deleteFileFromDirectory(dirHandleRef.current, fileName);
      if (!deleted) {
        setSaveStatus(`Failed to delete ${fileName}`);
        return;
      }

      // Refresh file list
      const files = await listMarkdownFiles(dirHandleRef.current);
      setArticleFiles(files);

      // If the deleted file was currently open, reset the editor
      if (activeArticle === fileName) {
        const initialContent = `---\ntitle: ""\nemoji: "📝"\ntype: "tech"\ntopics: []\npublished: false\n---\n\n`;
        setActiveArticle(null);
        fileHandleRef.current = null;
        loadMarkdownDocument(initialContent, 'untitled.md');
      }

      setSaveStatus(`Deleted ${fileName}`);
    },
    [activeArticle, loadMarkdownDocument, setSaveStatus]
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

  return {
    sidebarOpen,
    setSidebarOpen,
    articleFiles,
    activeArticle,
    dirHandleName: dirHandleRef.current?.name ?? null,
    createNewDraft,
    handleOpenDirectory,
    handleRefreshFiles,
    handleSelectFile,
    handleCreateNewArticle,
    handleDeleteArticle,
    saveDocument,
  };
};
