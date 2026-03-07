import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ImageModalState = {
  src: string;
  alt: string;
  title: string;
  width: string;
  height: string;
  pos: number | null;
};

type ImageModalProps = {
  state: ImageModalState;
  onClose: () => void;
  onApply: (state: ImageModalState) => void;
};

export const ImageModal = ({ state, onClose, onApply }: ImageModalProps) => {
  const [draft, setDraft] = useState(state);

  useEffect(() => {
    setDraft(state);
  }, [state]);

  const handleApply = useCallback(() => {
    if (!draft.src.trim()) return;
    onApply(draft);
  }, [draft, onApply]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>画像</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-url">
              URL <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="image-url"
              type="url"
              value={draft.src}
              onChange={(e) => setDraft((d) => ({ ...d, src: e.target.value }))}
              placeholder="https://example.com/image.png"
              aria-label="画像 URL"
              // biome-ignore lint/a11y/noAutofocus: intentional focus for dialog
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-alt">代替テキスト (alt)</Label>
            <Input
              id="image-alt"
              type="text"
              value={draft.alt}
              onChange={(e) => setDraft((d) => ({ ...d, alt: e.target.value }))}
              placeholder="画像の説明"
              aria-label="代替テキスト"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="image-title">タイトル (任意)</Label>
            <Input
              id="image-title"
              type="text"
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="ホバー時に表示されるテキスト"
              aria-label="タイトル"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="image-width">幅 (px, 任意)</Label>
              <Input
                id="image-width"
                type="text"
                inputMode="numeric"
                value={draft.width}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, width: e.target.value }))
                }
                placeholder="例: 480"
                aria-label="幅"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="image-height">高さ (px, 任意)</Label>
              <Input
                id="image-height"
                type="text"
                inputMode="numeric"
                value={draft.height}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, height: e.target.value }))
                }
                placeholder="例: 320"
                aria-label="高さ"
              />
            </div>
          </div>
        </div>

        {draft.src.trim() && (
          <div className="flex items-center justify-center overflow-hidden rounded-md border p-2.5">
            <img
              src={draft.src.trim()}
              alt={draft.alt || 'プレビュー'}
              className="max-h-[220px] max-w-full rounded object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              onLoad={(e) => {
                (e.target as HTMLImageElement).style.display = '';
              }}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleApply} disabled={!draft.src.trim()}>
            {state.pos !== null ? '更新' : '挿入'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
