type HybridSurfaceProps = {
  frontmatter: string;
  body: string;
  renderedHtml: string;
  onChangeFrontmatter: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export const HybridSurface = ({
  frontmatter,
  body,
  renderedHtml,
  onChangeFrontmatter,
  onChangeBody,
}: HybridSurfaceProps) => {
  return (
    <section className="workspace-grid">
      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="panel-label">Editor</p>
            <h2>Unified markdown surface</h2>
          </div>
        </header>

        <div className="editor-surface editor-surface--visual">
          <div className="hybrid-surface">
            <div className="hybrid-surface__input">
              <p className="panel-label">YAML formatter input</p>
              <label className="source-label" htmlFor="frontmatter-editor">
                YAML frontmatter
              </label>
              <textarea
                id="frontmatter-editor"
                className="source-editor source-editor--frontmatter"
                value={frontmatter}
                onChange={(event) => onChangeFrontmatter(event.target.value)}
                spellCheck={false}
              />

              <label className="source-label" htmlFor="markdown-editor">
                Markdown body
              </label>
              <textarea
                id="markdown-editor"
                className="source-editor source-editor--fused"
                value={body}
                onChange={(event) => onChangeBody(event.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="hybrid-surface__divider" aria-hidden="true" />
            <div className="hybrid-surface__render">
              <p className="panel-label">Rendered output</p>
              <div
                className="hybrid-surface__preview preview-surface__content znc"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: intentionally rendering markdown output
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};
