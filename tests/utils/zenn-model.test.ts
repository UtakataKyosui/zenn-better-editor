import { describe, expect, test } from '@rstest/core';
import { validateWithZennModel } from '../../src/utils/zenn-model';

describe('validateWithZennModel', () => {
  test('returns ok for valid article metadata', () => {
    const result = validateWithZennModel({
      documentName: 'validslugname.md',
      frontmatter: [
        'title: "Valid article"',
        'emoji: "📘"',
        'type: "tech"',
        'topics:',
        '  - react',
        'published: true',
      ].join('\n'),
      bodyHtml: '<p>hello</p>',
    });

    expect(result.isValid).toBe(true);
    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.summaryLabel).toBe('zenn-model: OK');
  });

  test('returns critical errors for invalid metadata', () => {
    const result = validateWithZennModel({
      documentName: 'short.md',
      frontmatter: [
        'title: ""',
        'emoji: ""',
        'type: "tech"',
        'topics: []',
        'published: false',
      ].join('\n'),
      bodyHtml: '<p>hello</p>',
    });

    expect(result.isValid).toBe(false);
    expect(result.criticalCount).toBeGreaterThan(0);
    expect(result.summaryLabel).toContain('critical');
  });
});
