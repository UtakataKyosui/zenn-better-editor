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

const TOC_DEPTH_OPTIONS = [
  { value: '2' as const, label: 'H2まで', icon: '🔖' },
  { value: '1' as const, label: 'H1のみ', icon: '📌' },
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

      <div className="book-config-panel__row">
        <BadgeSelector
          options={TOC_DEPTH_OPTIONS}
          selected={String(config.toc_depth) as '1' | '2'}
          onChange={(v) => update({ toc_depth: v === '1' ? 1 : 2 })}
          label="目次の深さ"
        />
      </div>

      <div className="book-config-panel__topics">
        <TopicTagInput
          topics={config.topics}
          onChange={(topics) => update({ topics })}
        />
      </div>

      {config.chapters !== undefined && (
        <div className="book-config-panel__chapters">
          <div className="book-config-panel__chapters-label">チャプター順序</div>
          <ChapterOrderEditor
            chapters={config.chapters}
            onChange={(chapters) => update({ chapters })}
          />
        </div>
      )}
    </div>
  );
};

type ChapterOrderEditorProps = {
  chapters: string[];
  onChange: (chapters: string[]) => void;
};

const ChapterOrderEditor = ({ chapters, onChange }: ChapterOrderEditorProps) => {
  const move = (index: number, dir: -1 | 1) => {
    const next = [...chapters];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(chapters.filter((_, i) => i !== index));
  };

  const add = () => {
    const slug = prompt('チャプターのスラッグ（ファイル名から .md を除いたもの）を入力');
    if (slug?.trim()) onChange([...chapters, slug.trim()]);
  };

  return (
    <ol className="book-config-panel__chapter-order-list">
      {chapters.map((slug, i) => (
        <li key={slug} className="book-config-panel__chapter-order-item">
          <span className="book-config-panel__chapter-order-slug">{slug}</span>
          <div className="book-config-panel__chapter-order-actions">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="上へ">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === chapters.length - 1} aria-label="下へ">↓</button>
            <button type="button" onClick={() => remove(i)} aria-label="削除">×</button>
          </div>
        </li>
      ))}
      <li>
        <button type="button" className="book-config-panel__chapter-order-add" onClick={add}>
          + チャプターを追加
        </button>
      </li>
    </ol>
  );
};
