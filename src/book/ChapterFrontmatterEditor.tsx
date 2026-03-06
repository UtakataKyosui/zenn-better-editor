import { useCallback, useEffect, useRef } from 'react';

type ChapterFrontmatter = {
  title: string;
  free: boolean;
};

const unquote = (v: string) => {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
};

const parseFrontmatter = (yaml: string): ChapterFrontmatter => {
  let title = '';
  let free = false;
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)/);
    if (!m) continue;
    if (m[1] === 'title') title = unquote(m[2]);
    if (m[1] === 'free') free = m[2].trim() === 'true';
  }
  return { title, free };
};

const serializeFrontmatter = (data: ChapterFrontmatter): string => {
  const lines = [`title: "${data.title}"`];
  if (data.free) lines.push('free: true');
  return lines.join('\n');
};

type Props = {
  frontmatter: string;
  chapterNum: string;
  onChange: (frontmatter: string) => void;
};

export const ChapterFrontmatterEditor = ({ frontmatter, chapterNum, onChange }: Props) => {
  const data = parseFrontmatter(frontmatter);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [chapterNum]);

  const update = useCallback(
    (patch: Partial<ChapterFrontmatter>) => {
      onChange(serializeFrontmatter({ ...data, ...patch }));
    },
    [data, onChange],
  );

  return (
    <div className="chapter-frontmatter-editor" aria-label="チャプター設定">
      <div className="chapter-frontmatter-editor__num">チャプター {chapterNum}</div>
      <input
        ref={titleRef}
        type="text"
        className="chapter-frontmatter-editor__title"
        value={data.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="チャプタータイトルを入力..."
        aria-label="チャプタータイトル"
      />
      <label className="chapter-frontmatter-editor__free">
        <input
          type="checkbox"
          checked={data.free}
          onChange={(e) => update({ free: e.target.checked })}
          aria-label="無料公開チャプター"
        />
        無料公開チャプター
      </label>
    </div>
  );
};
