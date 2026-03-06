type HeroPanelProps = {
  documentName: string;
  saveStatus: string;
  modelStatus: string;
  wordCount: number;
  readingMinutes: number;
  onCreateNewDraft: () => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  onDownloadDocument: () => void;
};

export const HeroPanel = ({
  documentName,
  saveStatus,
  modelStatus,
  wordCount,
  readingMinutes,
  onCreateNewDraft,
  onOpenDocument,
  onSaveDocument,
  onDownloadDocument,
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
