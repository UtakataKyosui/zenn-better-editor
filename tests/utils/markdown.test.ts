import { describe, expect, it } from '@rstest/core';
import {
  countWords,
  mergeMarkdownParts,
  splitMarkdownParts,
} from '../../src/utils/markdown';

describe('markdown utils', () => {
  describe('splitMarkdownParts', () => {
    it('splits correctly with frontmatter', () => {
      const input = `---\ntitle: "test"\n---\n\nbody here`;
      const result = splitMarkdownParts(input);
      expect(result.frontmatter).toBe('title: "test"');
      expect(result.body).toBe('body here');
    });

    it('handles no frontmatter', () => {
      const input = `body here`;
      const result = splitMarkdownParts(input);
      expect(result.frontmatter).toBe('');
      expect(result.body).toBe('body here');
    });
  });

  describe('mergeMarkdownParts', () => {
    it('merges frontmatter and body', () => {
      const result = mergeMarkdownParts({
        frontmatter: 'title: "test"',
        body: 'body here',
      });
      expect(result).toBe('---\ntitle: "test"\n---\n\nbody here');
    });

    it('ignores empty frontmatter', () => {
      const result = mergeMarkdownParts({ frontmatter: '', body: 'body here' });
      expect(result).toBe('body here');
    });
  });

  describe('countWords', () => {
    it('counts words excluding frontmatter and code blocks', () => {
      const input = `---\ntitle: "test"\n---\n\nHello world\n\n\`\`\`ts\nconst a = 1;\n\`\`\``;
      expect(countWords(input)).toBe(2);
    });

    it('returns 0 for empty parts', () => {
      expect(countWords('')).toBe(0);
    });
  });
});
