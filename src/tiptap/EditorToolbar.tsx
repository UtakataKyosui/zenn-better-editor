import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type EditorToolbarProps = {
  onInsertMath: () => void;
  onInsertMermaid: () => void;
  onInsertImage: () => void;
};

export const EditorToolbar = ({
  onInsertMath,
  onInsertMermaid,
  onInsertImage,
}: EditorToolbarProps) => {
  return (
    <TooltipProvider>
      <div className="tiptap-editor-toolbar">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="tiptap-editor-toolbar__btn"
              onClick={onInsertMath}
            >
              ∑ 数式
            </Button>
          </TooltipTrigger>
          <TooltipContent>数式を挿入 (LaTeX)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="tiptap-editor-toolbar__btn"
              onClick={onInsertMermaid}
            >
              ◇ Mermaid
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mermaid ダイアグラムを挿入</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="tiptap-editor-toolbar__btn"
              onClick={onInsertImage}
            >
              🖼 画像
            </Button>
          </TooltipTrigger>
          <TooltipContent>画像を挿入</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
