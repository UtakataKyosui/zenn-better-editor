export type ZennFrontmatter = {
  title: string;
  emoji: string;
  type: 'tech' | 'idea';
  topics: string[];
  published: boolean;
  publication_name?: string;
  published_at?: string;
};

const DEFAULT_FRONTMATTER: ZennFrontmatter = {
  title: '',
  emoji: '',
  type: 'tech',
  topics: [],
  published: false,
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
  return inner
    .split(',')
    .map((t) => unquote(t.trim()))
    .filter(Boolean);
};

export const parseFrontmatter = (yaml: string): ZennFrontmatter => {
  if (!yaml.trim()) return { ...DEFAULT_FRONTMATTER };

  const result: ZennFrontmatter = { ...DEFAULT_FRONTMATTER, topics: [] };
  const lines = yaml.split('\n');

  let collectingTopics = false;

  for (const line of lines) {
    // Check if this is a list item under topics
    if (collectingTopics) {
      const listMatch = line.match(/^\s+-\s+(.+)/);
      if (listMatch) {
        result.topics.push(unquote(listMatch[1]));
        continue;
      }
      // No longer a list item, stop collecting
      collectingTopics = false;
    }

    const kvMatch = line.match(/^(\w+):\s*(.*)/);
    if (!kvMatch) continue;

    const [, key, rawValue] = kvMatch;
    const value = rawValue.trim();

    switch (key) {
      case 'title':
        result.title = unquote(value);
        break;
      case 'emoji':
        result.emoji = unquote(value);
        break;
      case 'type':
        result.type = unquote(value) === 'idea' ? 'idea' : 'tech';
        break;
      case 'topics':
        if (value.startsWith('[')) {
          result.topics = parseTopicsInline(value);
        } else if (!value) {
          collectingTopics = true;
        }
        break;
      case 'published':
        result.published = value === 'true';
        break;
      case 'publication_name':
        result.publication_name = unquote(value);
        break;
      case 'published_at':
        result.published_at = unquote(value);
        break;
    }
  }

  return result;
};

export const serializeFrontmatter = (data: ZennFrontmatter): string => {
  const lines: string[] = [];

  lines.push(`title: "${data.title}"`);
  lines.push(`emoji: "${data.emoji}"`);
  lines.push(`type: "${data.type}"`);

  if (data.topics.length === 0) {
    lines.push('topics: []');
  } else {
    lines.push('topics:');
    for (const topic of data.topics) {
      lines.push(`  - ${topic}`);
    }
  }

  lines.push(`published: ${data.published}`);

  if (data.publication_name) {
    lines.push(`publication_name: "${data.publication_name}"`);
  }
  if (data.published_at) {
    lines.push(`published_at: "${data.published_at}"`);
  }

  return lines.join('\n');
};
