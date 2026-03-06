export type BookConfig = {
  title: string;
  summary: string;
  topics: string[];
  price: number;
  published: boolean;
  toc_depth: 0 | 1 | 2 | 3;
  /** Slug-based chapter ordering (Zenn CLI new format) */
  chapters?: string[];
  /** Display icon emoji (UI only, not part of Zenn spec) */
  emoji?: string;
};

export const DEFAULT_BOOK_CONFIG: BookConfig = {
  title: '',
  summary: '',
  topics: [],
  price: 0,
  published: false,
  toc_depth: 2,
};

const unquote = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseTopicsInline = (value: string): string[] => {
  const inner = value.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner.split(',').map((t) => unquote(t.trim())).filter(Boolean);
};

type CollectingList = 'topics' | 'chapters' | null;

export const parseBookConfig = (yaml: string): BookConfig => {
  if (!yaml.trim()) return { ...DEFAULT_BOOK_CONFIG };

  const result: BookConfig = { ...DEFAULT_BOOK_CONFIG, topics: [] };
  const lines = yaml.split('\n');
  let collecting: CollectingList = null;

  for (const line of lines) {
    if (collecting) {
      const listMatch = line.match(/^\s+-\s+(.+)/);
      if (listMatch) {
        if (collecting === 'topics') result.topics.push(unquote(listMatch[1]));
        else if (collecting === 'chapters') (result.chapters ??= []).push(unquote(listMatch[1]));
        continue;
      }
      collecting = null;
    }

    const kvMatch = line.match(/^(\w+):\s*(.*)/);
    if (!kvMatch) continue;

    const [, key, rawValue] = kvMatch;
    const value = rawValue.trim();

    switch (key) {
      case 'title':
        result.title = unquote(value);
        break;
      case 'summary':
        result.summary = unquote(value);
        break;
      case 'topics':
        if (value.startsWith('[')) {
          result.topics = parseTopicsInline(value);
        } else if (!value) {
          collecting = 'topics';
        }
        break;
      case 'chapters':
        if (!value) {
          collecting = 'chapters';
          result.chapters = [];
        }
        break;
      case 'price':
        result.price = Number.parseInt(value, 10) || 0;
        break;
      case 'published':
        result.published = value === 'true';
        break;
      case 'emoji':
        result.emoji = unquote(value);
        break;
      case 'toc_depth': {
        const d = Number.parseInt(value, 10);
        result.toc_depth = (d === 0 || d === 1 || d === 3) ? d : 2;
        break;
      }
    }
  }

  return result;
};

export const serializeBookConfig = (config: BookConfig): string => {
  const lines: string[] = [];
  if (config.emoji) lines.push(`emoji: "${config.emoji}"`);
  lines.push(`title: "${config.title}"`);
  lines.push(`summary: "${config.summary}"`);
  if (config.topics.length === 0) {
    lines.push('topics: []');
  } else {
    lines.push('topics:');
    for (const topic of config.topics) {
      lines.push(`  - ${topic}`);
    }
  }
  lines.push(`price: ${config.price}`);
  lines.push(`published: ${config.published}`);
  lines.push(`toc_depth: ${config.toc_depth}`);
  if (config.chapters && config.chapters.length > 0) {
    lines.push('chapters:');
    for (const ch of config.chapters) {
      lines.push(`  - ${ch}`);
    }
  }
  return lines.join('\n');
};

export type BookChapter = {
  id: string;
  name: string;
  handle: FileSystemFileHandle;
  title: string;
};

export type BookState = {
  dirHandle: FileSystemDirectoryHandle;
  slug: string;
  chapters: BookChapter[];
  activeView: string | null; // chapter id, or null = config panel
  config: BookConfig;
};

const parseChapterTitle = (markdown: string): string => {
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return '';
  const titleMatch = fmMatch[1].match(/^title:\s*(.+)/m);
  if (!titleMatch) return '';
  return unquote(titleMatch[1].trim());
};

export const loadBookFromDirectory = async (
  dirHandle: FileSystemDirectoryHandle,
): Promise<BookState> => {
  let config = { ...DEFAULT_BOOK_CONFIG };

  // Read config.yaml
  try {
    const configHandle = await dirHandle.getFileHandle('config.yaml');
    const file = await configHandle.getFile();
    config = parseBookConfig(await file.text());
  } catch {
    // config.yaml doesn't exist yet
  }

  const chapters: BookChapter[] = [];

  if (config.chapters && config.chapters.length > 0) {
    // Slug-based chapters ordered by config.yaml chapters field
    for (const slug of config.chapters) {
      const name = `${slug}.md`;
      try {
        const handle = await dirHandle.getFileHandle(name);
        const file = await handle.getFile();
        const text = await file.text();
        chapters.push({
          id: slug,
          name,
          handle,
          title: parseChapterTitle(text) || slug,
        });
      } catch {
        // File missing, skip
      }
    }
  } else {
    // Numbered chapters: 1.md, 2.md, …
    // biome-ignore lint/suspicious/noExplicitAny: File System Access API
    for await (const [name, handle] of (dirHandle as any).entries()) {
      if (handle.kind !== 'file') continue;
      const numMatch = name.match(/^(\d+)\.md$/);
      if (!numMatch) continue;

      const file = await (handle as FileSystemFileHandle).getFile();
      const text = await file.text();
      chapters.push({
        id: numMatch[1],
        name,
        handle: handle as FileSystemFileHandle,
        title: parseChapterTitle(text) || `チャプター ${numMatch[1]}`,
      });
    }
    chapters.sort((a, b) => Number(a.id) - Number(b.id));
  }

  return {
    dirHandle,
    slug: dirHandle.name,
    chapters,
    activeView: chapters[0]?.id ?? null,
    config,
  };
};
