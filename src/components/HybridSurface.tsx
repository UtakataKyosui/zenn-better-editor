import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
  const [isYamlCollapsed, setIsYamlCollapsed] = useState(false);

  return (
    <section className="workspace-column">
      <section
        className={`panel panel--yaml ${isYamlCollapsed ? 'panel--yaml-collapsed' : ''}`}
        aria-label="YAML section"
      >
        <button
          className="yaml-toggle-btn"
          onClick={() => setIsYamlCollapsed(!isYamlCollapsed)}
          aria-label={isYamlCollapsed ? "設定を開く" : "設定を閉じる"}
        >
          {isYamlCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          <span className="yaml-toggle-btn__text">
            {isYamlCollapsed ? '表示' : '隠す'}
          </span>
        </button>
        {!isYamlCollapsed && (
          <FrontmatterEditor
            frontmatter={frontmatter}
            onChange={onChangeFrontmatter}
          />
        )}
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
