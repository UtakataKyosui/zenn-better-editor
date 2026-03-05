import { FrontmatterEditor } from './FrontmatterEditor';
import { TiptapEditor } from './TiptapEditor';

type HybridSurfaceProps = {
  frontmatter: string;
  body: string;
  renderedHtml: string;
  isSeamless: boolean;
  onChangeFrontmatter: (value: string) => void;
  onChangeBody: (value: string) => void;
  onToggleSeamless: () => void;
};

export const HybridSurface = ({
  frontmatter,
  body,
  renderedHtml,
  isSeamless,
  onChangeFrontmatter,
  onChangeBody,
  onToggleSeamless,
}: HybridSurfaceProps) => {
  return (
    <section className="workspace-grid">
      <section className="panel">
        <header className="panel-header">
          <div className="panel-header">
            <div>
              <p className="panel-label">Editor</p>
              <h2>Unified markdown surface</h2>
            </div>
            <div className="toolbar">
              <button
                type="button"
                onClick={onToggleSeamless}
                title="Toggle between split and seamless views"
              >
                {isSeamless ? 'Split View' : 'Seamless View'}
              </button>
            </div>
          </div>
        </header>

        <div className="editor-surface editor-surface--visual">
          <div className={`hybrid-surface ${isSeamless ? 'is-seamless' : ''}`}>
            <div className="hybrid-surface__input">
              <FrontmatterEditor
                frontmatter={frontmatter}
                onChange={onChangeFrontmatter}
              />

              <label className="source-label" htmlFor="markdown-editor">
                Markdown body
              </label>
              <TiptapEditor
                id="markdown-editor"
                className="source-editor source-editor--fused tiptap-prose"
                markdown={body}
                initialHtml={renderedHtml}
                onChange={onChangeBody}
              />
            </div>

            {/* Divider only in split view */}
            {!isSeamless && (
              <div className="hybrid-surface__divider" aria-hidden="true" />
            )}

            {/* Preview: always shown, but in seamless mode it's stacked below */}
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
