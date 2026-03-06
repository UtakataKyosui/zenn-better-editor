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

      <section className="panel panel--editor" aria-label="Editor">
        {isInitialHtmlReady ? (
          <TiptapEditor
            id="markdown-editor"
            className="source-editor source-editor--fused source-editor--wysiwyg znc"
            ariaLabel="Markdown editor"
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
    </section>
  );
};
