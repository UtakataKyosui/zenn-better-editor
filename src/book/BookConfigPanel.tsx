import { useCallback, useMemo } from 'react';
import { TopicTagInput } from '../frontmatter/TopicTagInput';
import { BadgeSelector } from '../frontmatter/BadgeSelector';
import { type BookConfig, serializeBookConfig, parseBookConfig } from './book-config';

type BookConfigPanelProps = {
  configYaml: string;
  onChange: (yaml: string) => void;
};

const PUBLISHED_OPTIONS = [
  { value: 'false' as const, label: 'Draft', icon: '📝' },
  { value: 'true' as const, label: 'Published', icon: '🚀' },
];

const PRICE_OPTIONS = [
  { value: '0' as const, label: '無料', icon: '🆓' },
  { value: 'paid' as const, label: '有料', icon: '💰' },
];

export const BookConfigPanel = ({ configYaml, onChange }: BookConfigPanelProps) => {
  const config = useMemo(() => parseBookConfig(configYaml), [configYaml]);

  const update = useCallback(
    (patch: Partial<BookConfig>) => {
      onChange(serializeBookConfig({ ...config, ...patch }));
    },
    [config, onChange],
  );

  return (
    <div className="book-config-panel" aria-label="本の設定">
      <div className="book-config-panel__icon">📚</div>

      <input
        className="book-config-panel__title"
        type="text"
        value={config.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="本のタイトルを入力..."
        aria-label="タイトル"
      />

      <textarea
        className="book-config-panel__summary"
        value={config.summary}
        onChange={(e) => update({ summary: e.target.value })}
        placeholder="本の概要を入力..."
        aria-label="概要"
        rows={3}
      />

      <div className="book-config-panel__row">
        <BadgeSelector
          options={PUBLISHED_OPTIONS}
          selected={String(config.published) as 'true' | 'false'}
          onChange={(v) => update({ published: v === 'true' })}
          label="公開状態"
        />
        <BadgeSelector
          options={PRICE_OPTIONS}
          selected={config.price === 0 ? '0' : 'paid'}
          onChange={(v) => update({ price: v === '0' ? 0 : 500 })}
          label="価格設定"
        />
      </div>

      <div className="book-config-panel__topics">
        <TopicTagInput
          topics={config.topics}
          onChange={(topics) => update({ topics })}
        />
      </div>
    </div>
  );
};
