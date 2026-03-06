import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type ZennFrontmatter,
  parseFrontmatter,
  serializeFrontmatter,
} from './frontmatter';
import { BadgeSelector } from './BadgeSelector';
import { EmojiPicker } from './EmojiPicker';
import { TopicTagInput } from './TopicTagInput';

type FrontmatterEditorProps = {
  frontmatter: string;
  onChange: (frontmatter: string) => void;
};

const TYPE_OPTIONS = [
  { value: 'tech' as const, label: 'Tech', icon: '💻' },
  { value: 'idea' as const, label: 'Idea', icon: '💡' },
];

const PUBLISHED_OPTIONS = [
  { value: 'false' as const, label: 'Draft', icon: '📝' },
  { value: 'true' as const, label: 'Published', icon: '🚀' },
];

export const FrontmatterEditor = ({
  frontmatter,
  onChange,
}: FrontmatterEditorProps) => {
  const data = useMemo(() => parseFrontmatter(frontmatter), [frontmatter]);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [data.title]);

  const update = useCallback(
    (patch: Partial<ZennFrontmatter>) => {
      const next = { ...data, ...patch };
      onChange(serializeFrontmatter(next));
    },
    [data, onChange],
  );

  return (
    <div className="zenn-header-preview" aria-label="YAML frontmatter">
      {/* Emoji - large, centered */}
      <EmojiPicker
        value={data.emoji}
        onChange={(emoji) => update({ emoji })}
        triggerClassName="zenn-header-preview__emoji-btn"
      />

      {/* Title */}
      <textarea
        ref={titleRef}
        id="fm-title"
        className="zenn-header-preview__title"
        value={data.title}
        onChange={(e) => {
          update({ title: e.target.value });
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        placeholder="記事タイトルを入力..."
        aria-label="Title"
        rows={1}
      />

      {/* Type + Published */}
      <div className="zenn-header-preview__meta-row">
        <BadgeSelector
          options={TYPE_OPTIONS}
          selected={data.type}
          onChange={(value) => update({ type: value })}
          label="Article type"
        />
        <BadgeSelector
          options={PUBLISHED_OPTIONS}
          selected={String(data.published) as 'true' | 'false'}
          onChange={(value) => update({ published: value === 'true' })}
          label="Publish status"
        />
      </div>

      {/* Topics */}
      <div className="zenn-header-preview__topics-row">
        <TopicTagInput
          topics={data.topics}
          onChange={(topics) => update({ topics })}
        />
      </div>
    </div>
  );
};
