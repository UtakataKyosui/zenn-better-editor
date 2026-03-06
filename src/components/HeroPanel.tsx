type HeroPanelProps = {
  documentName: string;
  saveStatus: string;
  modelStatus: string;
  wordCount: number;
  readingMinutes: number;
  isDark: boolean;
  onCreateNewDraft: () => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  onDownloadDocument: () => void;
  onToggleTheme: () => void;
};

export const HeroPanel = ({
  documentName,
  saveStatus,
  modelStatus,
  wordCount,
  readingMinutes,
  isDark,
  onCreateNewDraft,
  onOpenDocument,
  onSaveDocument,
  onDownloadDocument,
  onToggleTheme,
}: HeroPanelProps) => {
  return (
    <header className="top-bar">
      <span className="top-bar__brand">Rich Zenn Editor</span>

      <nav
        className="top-bar__actions"
        role="toolbar"
        aria-label="document controls"
      >
        <button type="button" onClick={onCreateNewDraft}>
          New draft
        </button>
        <button type="button" onClick={onOpenDocument}>
          Open .md
        </button>
        <button type="button" onClick={onSaveDocument}>
          Save
        </button>
        <button type="button" onClick={onDownloadDocument}>
          Download
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="top-bar__theme-toggle"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </nav>

      <span className="top-bar__doc-name">{documentName}</span>
      <span className="top-bar__save-status">{saveStatus}</span>

      <output className="top-bar__status" aria-label="editor status">
        <span>{wordCount} words</span>
        <span>{readingMinutes} min read</span>
        <span>{modelStatus}</span>
      </output>
    </header>
  );
};
