import { useCallback, useMemo } from 'react';
import {
  type ZennFrontmatter,
  parseFrontmatter,
  serializeFrontmatter,
} from './frontmatter';
import { BadgeSelector } from './BadgeSelector';
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

  const update = useCallback(
    (patch: Partial<ZennFrontmatter>) => {
      const next = { ...data, ...patch };
      onChange(serializeFrontmatter(next));
    },
    [data, onChange],
  );

  return (
    <fieldset className="frontmatter-editor" aria-label="YAML frontmatter">
      {/* Title */}
      <div className="fm-field">
        <label className="fm-field__label" htmlFor="fm-title">
          Title
        </label>
        <input
          id="fm-title"
          type="text"
          className="fm-field__input"
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Article title..."
        />
      </div>

      {/* Emoji */}
      <div className="fm-field fm-field--inline">
        <label className="fm-field__label" htmlFor="fm-emoji">
          Emoji
        </label>
        <input
          id="fm-emoji"
          type="text"
          className="fm-field__input fm-field__input--emoji"
          value={data.emoji}
          onChange={(e) => {
            // Take only the last grapheme cluster entered
            const chars = [...e.target.value];
            const lastChar = chars[chars.length - 1] ?? '';
            update({ emoji: lastChar });
          }}
          placeholder="📝"
          maxLength={4}
        />
      </div>

      {/* Type */}
      <div className="fm-field">
        <span className="fm-field__label">Type</span>
        <BadgeSelector
          options={TYPE_OPTIONS}
          selected={data.type}
          onChange={(value) => update({ type: value })}
          label="Article type"
        />
      </div>

      {/* Topics */}
      <div className="fm-field">
        <span className="fm-field__label">Topics</span>
        <TopicTagInput
          topics={data.topics}
          onChange={(topics) => update({ topics })}
        />
      </div>

      {/* Published */}
      <div className="fm-field">
        <span className="fm-field__label">Status</span>
        <BadgeSelector
          options={PUBLISHED_OPTIONS}
          selected={String(data.published) as 'true' | 'false'}
          onChange={(value) => update({ published: value === 'true' })}
          label="Publish status"
        />
      </div>
    </fieldset>
  );
};
