import katex from 'katex';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export type MathModalState = {
  formula: string;
  type: 'inline' | 'block';
  pos: number | null;
  endPos: number | null;
};

type MathModalProps = {
  state: MathModalState;
  onClose: () => void;
  onApply: (
    formula: string,
    type: 'inline' | 'block',
    state: MathModalState,
  ) => void;
};

export const MathModal = ({ state, onClose, onApply }: MathModalProps) => {
  const [draft, setDraft] = useState(state.formula);
  const [mathType, setMathType] = useState<'inline' | 'block'>(state.type);

  useEffect(() => {
    setDraft(state.formula);
    setMathType(state.type);
  }, [state]);

  const previewHtml = useMemo(() => {
    if (!draft.trim()) return '';
    try {
      return katex.renderToString(draft.trim(), {
        throwOnError: false,
        displayMode: mathType === 'block',
      });
    } catch {
      return '';
    }
  }, [draft, mathType]);

  const handleApply = useCallback(() => {
    onApply(draft, mathType, state);
  }, [draft, mathType, state, onApply]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>数式 (LaTeX)</DialogTitle>
          <div className="flex gap-1.5 pt-2">
            <Button
              variant={mathType === 'inline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMathType('inline')}
            >
              インライン $…$
            </Button>
            <Button
              variant={mathType === 'block' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMathType('block')}
            >
              ブロック $$…$$
            </Button>
          </div>
        </DialogHeader>

        <Textarea
          className="min-h-[100px] font-mono"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例: \frac{a}{b} = \sqrt{c^2 + d^2}"
          spellCheck={false}
          aria-label="LaTeX 数式"
          // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
          autoFocus
        />

        {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label for preview container */}
        <div
          className={`flex min-h-[60px] items-center justify-center overflow-x-auto rounded-md border p-3.5 ${
            previewHtml ? '' : 'text-sm italic text-muted-foreground'
          }`}
          aria-label="プレビュー"
        >
          {previewHtml ? (
            // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX output is sanitized by the library
            <span dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            'プレビューがここに表示されます'
          )}
        </div>

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
