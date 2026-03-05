export type MarkdownParts = {
  frontmatter: string;
  body: string;
};

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)*/;

export const splitMarkdownParts = (value: string): MarkdownParts => {
  const match = value.match(FRONTMATTER_PATTERN);

  if (!match) {
    return {
      frontmatter: '',
      body: value,
    };
  }

  return {
    frontmatter: match[1],
    body: value.slice(match[0].length),
  };
};

export const stripLeadingFrontmatter = (value: string) => {
  const parts = splitMarkdownParts(value);
  return parts.frontmatter ? parts.body : value;
};

export const mergeMarkdownParts = ({ frontmatter, body }: MarkdownParts) => {
  const normalizedFrontmatter = frontmatter.trim();

  if (!normalizedFrontmatter) {
    return body;
  }

  const normalizedBody = body.replace(/^\s*/, '');
  return `---\n${normalizedFrontmatter}\n---\n\n${normalizedBody}`;
};

export const countWords = (value: string) => {
  const normalized = value
    .replace(/^---[\s\S]*?---/m, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\s+/).length;
};
