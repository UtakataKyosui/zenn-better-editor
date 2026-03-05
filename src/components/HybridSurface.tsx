import { useEffect, useRef } from 'react';
import { primeZennEmbeddedIframes } from '../utils/zenn-embed-runtime';
import { FrontmatterEditor } from './FrontmatterEditor';
import { TiptapEditor } from './TiptapEditor';

type HybridSurfaceProps = {
  frontmatter: string;
  body: string;
  renderedHtml: string;
  isInitialHtmlReady: boolean;
  isSeamless: boolean;
  onChangeFrontmatter: (value: string) => void;
  onChangeBody: (value: string) => void;
  onToggleSeamless: () => void;
};

export const HybridSurface = ({
  frontmatter,
  body,
  renderedHtml,
  isInitialHtmlReady,
  isSeamless,
  onChangeFrontmatter,
  onChangeBody,
  onToggleSeamless,
}: HybridSurfaceProps) => {
  const splitPreviewRef = useRef<HTMLDivElement | null>(null);
  const editorLabel = isSeamless
    ? 'WYSIWYG body (type directly in preview)'
    : 'Markdown body';
  const editorClassName = isSeamless
    ? 'source-editor source-editor--fused source-editor--wysiwyg znc'
    : 'source-editor source-editor--fused tiptap-prose';

  useEffect(() => {
    if (isSeamless) return;
    if (!splitPreviewRef.current) return;
    primeZennEmbeddedIframes(splitPreviewRef.current);
  }, [isSeamless, renderedHtml]);

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

            {/* Divider only in split view */}
            {!isSeamless && (
              <div className="hybrid-surface__divider" aria-hidden="true" />
            )}

            {!isSeamless && (
              <div className="hybrid-surface__render">
                <p className="panel-label">Rendered output</p>
                <div
                  ref={splitPreviewRef}
                  className="hybrid-surface__preview preview-surface__content znc"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: intentionally rendering markdown output
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
};
