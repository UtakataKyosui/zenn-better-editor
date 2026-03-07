import { expect, test } from '@rstest/core';
import { parseZennImageInsertionLine } from '../../src/tiptap/extensions/zenn-image-transform';

test('parses plain zenn image markdown with size', () => {
  const parsed = parseZennImageInsertionLine(
    '![](https://example.com/foo.png =240x120)',
  );

  expect(parsed).toEqual({
    alt: '',
    src: 'https://example.com/foo.png',
    title: null,
    width: '240',
    height: '120',
    href: null,
  });
});

test('parses linked zenn image markdown', () => {
  const parsed = parseZennImageInsertionLine(
    '[![Alt](https://example.com/foo.png =180x)](https://zenn.dev)',
  );

  expect(parsed).toEqual({
    alt: 'Alt',
    src: 'https://example.com/foo.png',
    title: null,
    width: '180',
    height: null,
    href: 'https://zenn.dev',
  });
});

test('returns null for non-image paragraph content', () => {
  expect(parseZennImageInsertionLine('これは普通の段落です')).toBeNull();
  expect(
    parseZennImageInsertionLine(
      '画像 ![](https://example.com/foo.png) を含む文',
    ),
  ).toBeNull();
});
