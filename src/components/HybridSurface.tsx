import { FrontmatterEditor } from '../frontmatter/FrontmatterEditor';
import { TiptapEditor } from '../tiptap/TiptapEditor';

type HybridSurfaceProps = {
  frontmatter: string;
  body: string;
  renderedHtml: string;
  isInitialHtmlReady: boolean;
  onChangeFrontmatter: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export const HybridSurface = ({
  frontmatter,
  body,
  renderedHtml,
  isInitialHtmlReady,
  onChangeFrontmatter,
  onChangeBody,
}: HybridSurfaceProps) => {
  const editorLabel = 'WYSIWYG body (type directly in preview)';
  const editorClassName =
    'source-editor source-editor--fused source-editor--wysiwyg znc';

  return (
    <section className="workspace-grid">
      <section className="panel panel--yaml" aria-label="YAML section">
        <header className="panel-header">
          <div>
            <p className="panel-label">Metadata</p>
            <h2>YAML frontmatter</h2>
          </div>
        </header>

        <FrontmatterEditor
          frontmatter={frontmatter}
          onChange={onChangeFrontmatter}
        />
      </section>

      <section className="panel panel--editor" aria-label="Body section">
        <header className="panel-header">
          <div>
            <p className="panel-label">Editor</p>
            <h2>Unified markdown surface</h2>
          </div>
        </header>

        <div className="editor-surface editor-surface--visual">
          <div className="hybrid-surface is-seamless">
            <div className="hybrid-surface__input">
              <section className="editor-block editor-block--body">
                <label className="source-label" htmlFor="markdown-editor">
                  {editorLabel}
                </label>
                {isInitialHtmlReady ? (
                  <TiptapEditor
                    id="markdown-editor"
                    className={editorClassName}
                    ariaLabel={editorLabel}
                    markdown={body}
                    initialHtml={renderedHtml}
                    onChange={onChangeBody}
                  />
                ) : (
                  <div className="editor-loading" aria-live="polite">
                    Preparing WYSIWYG preview...
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
};
