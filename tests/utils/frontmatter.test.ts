import { describe, expect, it } from '@rstest/core';
import {
  parseFrontmatter,
  serializeFrontmatter,
  type ZennFrontmatter,
} from '../../src/utils/frontmatter';

describe('parseFrontmatter', () => {
  it('should parse a complete frontmatter string', () => {
    const yaml = `title: "Rich Zenn Editor preview demo"
emoji: "📚"
type: "tech"
topics:
  - editor
  - zenn
  - preview
published: false`;

    const result = parseFrontmatter(yaml);

    expect(result.title).toBe('Rich Zenn Editor preview demo');
    expect(result.emoji).toBe('📚');
    expect(result.type).toBe('tech');
    expect(result.topics).toEqual(['editor', 'zenn', 'preview']);
    expect(result.published).toBe(false);
  });

  it('should parse topics written as inline array', () => {
    const yaml = `title: "Test"
emoji: "🎉"
type: "idea"
topics: [react, typescript]
published: true`;

    const result = parseFrontmatter(yaml);

    expect(result.topics).toEqual(['react', 'typescript']);
    expect(result.published).toBe(true);
    expect(result.type).toBe('idea');
  });

  it('should handle missing fields with defaults', () => {
    const yaml = 'title: "Only title"';
    const result = parseFrontmatter(yaml);

    expect(result.title).toBe('Only title');
    expect(result.emoji).toBe('');
    expect(result.type).toBe('tech');
    expect(result.topics).toEqual([]);
    expect(result.published).toBe(false);
  });

  it('should handle empty string', () => {
    const result = parseFrontmatter('');

    expect(result.title).toBe('');
    expect(result.emoji).toBe('');
    expect(result.type).toBe('tech');
    expect(result.topics).toEqual([]);
    expect(result.published).toBe(false);
  });

  it('should handle unquoted string values', () => {
    const yaml = `title: My Article
emoji: 🔥
type: tech`;

    const result = parseFrontmatter(yaml);

    expect(result.title).toBe('My Article');
    expect(result.emoji).toBe('🔥');
  });
});

describe('serializeFrontmatter', () => {
  it('should serialize a complete frontmatter object', () => {
    const data: ZennFrontmatter = {
      title: 'Test Article',
      emoji: '📝',
      type: 'tech',
      topics: ['react', 'zenn'],
      published: false,
    };

    const yaml = serializeFrontmatter(data);

    expect(yaml).toContain('title: "Test Article"');
    expect(yaml).toContain('emoji: "📝"');
    expect(yaml).toContain('type: "tech"');
    expect(yaml).toContain('  - react');
    expect(yaml).toContain('  - zenn');
    expect(yaml).toContain('published: false');
  });

  it('should serialize empty topics as empty array', () => {
    const data: ZennFrontmatter = {
      title: 'No topics',
      emoji: '',
      type: 'idea',
      topics: [],
      published: true,
    };

    const yaml = serializeFrontmatter(data);

    expect(yaml).toContain('topics: []');
    expect(yaml).toContain('published: true');
  });

  it('should round-trip parse and serialize', () => {
    const original: ZennFrontmatter = {
      title: 'Round Trip',
      emoji: '🔄',
      type: 'tech',
      topics: ['test', 'tdd'],
      published: false,
    };

    const serialized = serializeFrontmatter(original);
    const parsed = parseFrontmatter(serialized);

    expect(parsed).toEqual(original);
  });
});
