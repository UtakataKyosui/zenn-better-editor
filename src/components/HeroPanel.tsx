import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type HeroPanelProps = {
  documentName: string;
  saveStatus: string;
  modelStatus: string;
  wordCount: number;
  readingMinutes: number;
  isDark: boolean;
  onCreateNewDraft: () => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  onDownloadDocument: () => void;
  onToggleTheme: () => void;
};

export const HeroPanel = ({
  documentName,
  saveStatus,
  modelStatus,
  wordCount,
  readingMinutes,
  isDark,
  onCreateNewDraft,
  onOpenDocument,
  onSaveDocument,
  onDownloadDocument,
  onToggleTheme,
}: HeroPanelProps) => {
  return (
    <header className="top-bar">
      <span className="top-bar__brand">Rich Zenn Editor</span>

      <nav
        className="top-bar__actions"
        role="toolbar"
        aria-label="document controls"
      >
        <Button variant="outline" size="sm" onClick={onCreateNewDraft}>
          New draft
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenDocument}>
          Open .md
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveDocument}>
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={onDownloadDocument}>
          Download
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              aria-label={
                isDark ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="top-bar__theme-toggle"
            >
              {isDark ? '☀️' : '🌙'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          </TooltipContent>
        </Tooltip>
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
