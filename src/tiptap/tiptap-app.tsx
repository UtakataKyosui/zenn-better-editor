import { useState } from 'react';
import { ArticlesSidebar } from '../components/ArticlesSidebar';
import { HeroPanel } from '../components/HeroPanel';
import { HybridSurface } from '../components/HybridSurface';
import { NewArticleModal } from '../components/NewArticleModal';
import { TooltipProvider } from '../components/ui/tooltip';
import { countWords } from '../utils/markdown';
import { useTheme } from '../hooks/useTheme';
import { useEditorState } from '../hooks/useEditorState';
import { useWorkspace } from '../hooks/useWorkspace';

const Tiptap = () => {
  const { isDark, toggleTheme } = useTheme();

  const {
    frontmatter,
    body,
    renderedHtml,
    isInitialHtmlReady,
    documentName,
    saveStatus,
    markdown,
    modelValidation,
    initialMarkdown,
    setSaveStatus,
    setDocumentName,
    loadMarkdownDocument,
    handleFrontmatterChange,
    handleBodyChange,
  } = useEditorState();

  const {
    sidebarOpen,
    setSidebarOpen,
    articleFiles,
    activeArticle,
    dirHandleName,
    createNewDraft,
    handleOpenDirectory,
    handleRefreshFiles,
    handleSelectFile,
    handleCreateNewArticle,
    handleDeleteArticle,
    saveDocument,
  } = useWorkspace({
    markdown,
    documentName,
    initialMarkdown,
    frontmatter,
    modelValidation,
    loadMarkdownDocument,
    setSaveStatus,
    setDocumentName,
  });

  const [newArticleModalOpen, setNewArticleModalOpen] = useState(false);

  const wordCount = countWords(markdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <TooltipProvider delayDuration={300}>
      <div className="app-layout">
        <HeroPanel
          documentName={documentName}
          saveStatus={saveStatus}
          modelStatus={modelValidation.summaryLabel}
          wordCount={wordCount}
          readingMinutes={readingMinutes}
          isDark={isDark}
          onCreateNewDraft={() => createNewDraft(setNewArticleModalOpen)}
          onSaveDocument={() => void saveDocument()}
          onToggleTheme={toggleTheme}
        />

        <div className="app-body">
          <ArticlesSidebar
            isOpen={sidebarOpen}
            files={articleFiles}
            activeFile={activeArticle}
            directoryName={dirHandleName}
            onToggle={() => setSidebarOpen((o) => !o)}
            onOpenDirectory={() => void handleOpenDirectory()}
            onRefresh={() => void handleRefreshFiles()}
            onSelectFile={(f) => void handleSelectFile(f)}
            onCreateNewArticle={() => setNewArticleModalOpen(true)}
            onDeleteArticle={(f) => void handleDeleteArticle(f)}
          />

          <main className="editor-shell">
            <HybridSurface
              frontmatter={frontmatter}
              body={body}
              renderedHtml={renderedHtml}
              isInitialHtmlReady={isInitialHtmlReady}
              onChangeFrontmatter={handleFrontmatterChange}
              onChangeBody={handleBodyChange}
            />
          </main>
        </div>

        <NewArticleModal
          open={newArticleModalOpen}
          onOpenChange={setNewArticleModalOpen}
          onSubmit={(slug, fm) => {
            void handleCreateNewArticle(slug, fm, () => setNewArticleModalOpen(false));
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default Tiptap;
