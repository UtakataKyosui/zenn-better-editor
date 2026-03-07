import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ZennFrontmatter } from '../frontmatter/frontmatter';

type NewArticleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (slug: string, frontmatter: ZennFrontmatter) => void;
};

const EMOJI_PRESETS = [
  '📝', '🚀', '💡', '🔥', '⚡', '🎉', '🛠️', '📦', '🧪', '📖',
  '🎨', '🔒', '🌐', '🤖', '📊', '🗂️', '💻', '🔧', '📱', '🧩',
  '⚙️', '🏗️', '✅', '🐛', '📚', '💬', '🎯', '🪄', '🔍', '🧠',
];

const generateSlug = () =>
  crypto.randomUUID().slice(0, 20).replace(/-/g, '');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const NewArticleModal = ({
  open,
  onOpenChange,
  onSubmit,
}: NewArticleModalProps) => {
  const [slug, setSlug] = useState(generateSlug);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [type, setType] = useState<'tech' | 'idea'>('tech');
  const [topicsInput, setTopicsInput] = useState('');

  const isSlugValid =
    slug.length >= 12 && slug.length <= 50 && SLUG_PATTERN.test(slug);

  const resetForm = () => {
    setSlug(generateSlug());
    setTitle('');
    setEmoji('📝');
    setType('tech');
    setTopicsInput('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const topics = topicsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit(slug, {
      title,
      emoji,
      type,
      topics,
      published: false,
    });

    resetForm();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="new-article-modal">
        <DialogHeader>
          <DialogTitle>新規記事を作成</DialogTitle>
          <DialogDescription>
            記事のフロントマター情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="new-article-modal__form">
          {/* Slug */}
          <div className="new-article-modal__field">
            <label
              htmlFor="new-article-slug"
              className="new-article-modal__label"
            >
              スラグ（ファイル名）
            </label>
            <Input
              id="new-article-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              placeholder="my-article-slug"
              autoFocus
            />
            <span className={`new-article-modal__hint ${!isSlugValid && slug.length > 0 ? 'new-article-modal__hint--error' : ''}`}>
              {!isSlugValid && slug.length > 0
                ? '半角英数字とハイフンのみ。12〜50文字'
                : 'a-z, 0-9, ハイフンのみ使用可。12〜50文字'}
            </span>
          </div>

          {/* Title */}
          <div className="new-article-modal__field">
            <label
              htmlFor="new-article-title"
              className="new-article-modal__label"
            >
              タイトル
            </label>
            <Input
              id="new-article-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="記事のタイトルを入力"
            />
          </div>

          {/* Emoji */}
          <div className="new-article-modal__field">
            <label className="new-article-modal__label">
              アイコン (絵文字)
            </label>
            <div className="new-article-modal__emoji-row">
              <Input
                className="new-article-modal__emoji-input"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                maxLength={4}
              />
              <div className="new-article-modal__emoji-presets">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    className={`new-article-modal__emoji-btn ${emoji === e ? 'new-article-modal__emoji-btn--active' : ''}`}
                    onClick={() => setEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="new-article-modal__field">
            <label className="new-article-modal__label">タイプ</label>
            <div className="new-article-modal__type-row">
              <button
                type="button"
                className={`new-article-modal__type-btn ${type === 'tech' ? 'new-article-modal__type-btn--active' : ''}`}
                onClick={() => setType('tech')}
              >
                💻 Tech
              </button>
              <button
                type="button"
                className={`new-article-modal__type-btn ${type === 'idea' ? 'new-article-modal__type-btn--active' : ''}`}
                onClick={() => setType('idea')}
              >
                💡 Idea
              </button>
            </div>
          </div>

          {/* Topics */}
          <div className="new-article-modal__field">
            <label
              htmlFor="new-article-topics"
              className="new-article-modal__label"
            >
              トピック
            </label>
            <Input
              id="new-article-topics"
              value={topicsInput}
              onChange={(event) => setTopicsInput(event.target.value)}
              placeholder="カンマ区切りで入力（例: react, typescript）"
            />
            <span className="new-article-modal__hint">
              最大5個まで。カンマで区切ってください
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!isSlugValid}>
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
