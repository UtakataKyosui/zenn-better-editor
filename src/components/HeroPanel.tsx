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
      <p className="eyebrow">Phase 2: Markdown-first live preview</p>
      <h1>Rich Zenn Editor</h1>
      <p className="hero-copy">
        YAML Frontmatter と Markdown 本文を分離して編集しながら、同じ面の中で
        `zenn-markdown-html` のレンダリング結果を即時確認します。
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
        <span>Markdown direct input</span>
        <span>Preview synced live</span>
      </output>
    </section>
  );
};
