import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type MermaidModalState = {
  pos: number | null;
  source: string;
  language: string;
};

type MermaidModalProps = {
  state: MermaidModalState;
  onClose: () => void;
  onApply: (source: string, state: MermaidModalState) => void;
};

export const MermaidModal = ({
  state,
  onClose,
  onApply,
}: MermaidModalProps) => {
  const [draft, setDraft] = useState(state.source);

  useEffect(() => {
    setDraft(state.source);
  }, [state]);

  const handleApply = useCallback(() => {
    onApply(draft, state);
  }, [draft, state, onApply]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[780px]">
        <DialogHeader>
          <DialogTitle>Mermaid ダイアグラム</DialogTitle>
        </DialogHeader>

        <Textarea
          className="tiptap-mermaid-modal__input min-h-[280px] flex-1 font-mono"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'例: graph TD\n  A --> B --> C'}
          spellCheck={false}
          aria-label="Mermaid ソース"
          // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
          autoFocus
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleApply} disabled={!draft.trim()}>
            {state.pos !== null ? '更新' : '挿入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
