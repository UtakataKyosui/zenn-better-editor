import { expect, test } from '@rstest/core';
import {
  countExpectedZennSyntax,
  hasUnresolvedZennSyntax,
} from '../../src/utils/zenn-syntax';

test('counts complete zenn containers and embed lines', () => {
  const markdown = [
    ':::message',
    'message body',
    ':::',
    '',
    ':::details details title',
    'details body',
    ':::',
    '',
    '@[card](https://zenn.dev/zenn/articles/markdown-guide)',
    'https://zenn.dev/zenn/articles/markdown-guide',
    '',
  ].join('\n');

  expect(countExpectedZennSyntax(markdown)).toEqual({
    message: 1,
    details: 1,
    embed: 2,
  });
});

test('ignores zenn syntax markers inside code fences', () => {
  const markdown = [
    '```md',
    ':::message',
    'inside code block',
    ':::',
    '@[card](https://zenn.dev/zenn/articles/markdown-guide)',
    '```',
    '',
    ':::details outside',
    'visible block',
    ':::',
    '',
  ].join('\n');

  expect(countExpectedZennSyntax(markdown)).toEqual({
    message: 0,
    details: 1,
    embed: 0,
  });
});

test('detects unresolved zenn syntax by comparing expected and actual node counts', () => {
  const markdown = [
    ':::message',
    'text',
    ':::',
    '',
    '@[card](https://zenn.dev/zenn/articles/markdown-guide)',
    '',
  ].join('\n');

  const unresolvedDoc = {
    descendants: () => {},
  } as Parameters<typeof hasUnresolvedZennSyntax>[1];
  const resolvedDoc = {
    descendants: (
      callback: (node: { type: { name: string } }) => void,
    ) => {
      callback({ type: { name: 'zennMessage' } });
      callback({ type: { name: 'zennEmbedBlock' } });
    },
  } as Parameters<typeof hasUnresolvedZennSyntax>[1];

  expect(hasUnresolvedZennSyntax(markdown, unresolvedDoc)).toBe(true);
  expect(hasUnresolvedZennSyntax(markdown, resolvedDoc)).toBe(false);
});
