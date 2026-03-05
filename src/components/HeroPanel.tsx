type HeroPanelProps = {
  documentName: string;
  saveStatus: string;
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
  wordCount,
  readingMinutes,
  onCreateNewDraft,
  onOpenDocument,
  onSaveDocument,
  onDownloadDocument,
}: HeroPanelProps) => {
  return (
    <section className="hero-panel">
      <p className="eyebrow">Phase 3: WYSIWYG-first editing</p>
      <h1>Rich Zenn Editor</h1>
      <p className="hero-copy">
        YAML Frontmatter
        を管理しつつ、本文はプレビューの見た目のまま直接編集できます。
        必要なときだけ Split View に切り替えて、read-only
        の最終レンダリングを確認できます。
      </p>
      <div className="file-strip" role="toolbar" aria-label="document controls">
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
          Download copy
        </button>
        <span className="document-meta">{documentName}</span>
        <span className="document-meta">{saveStatus}</span>
      </div>
      <output className="status-strip" aria-label="editor status">
        <span>{wordCount} words</span>
        <span>{readingMinutes} min read</span>
        <span>WYSIWYG direct input</span>
        <span>Preview synced live</span>
      </output>
    </section>
  );
};
