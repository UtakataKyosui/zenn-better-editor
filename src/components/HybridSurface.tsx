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
    <section className="workspace-column">
      <section className="panel panel--yaml" aria-label="YAML section">
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
