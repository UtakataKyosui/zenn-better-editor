import { expect, test } from '@rstest/core';
import { render, waitFor } from '@testing-library/react';
import markdownToHtml from 'zenn-markdown-html';
import { TiptapEditor } from '../src/components/TiptapEditor';

test('renders syntax-highlighted spans in code blocks', async () => {
  const markdown = [
    '```ts:src/example.ts',
    'export const hello = (name: string) => {',
    "  return `Hello, ${name}`;",
    '};',
    '```',
    '',
  ].join('\n');

  const initialHtml = await markdownToHtml(markdown);

  const { container } = render(
    <TiptapEditor
      markdown={markdown}
      initialHtml={initialHtml}
      onChange={() => {}}
      className="source-editor source-editor--fused source-editor--wysiwyg znc"
      ariaLabel="WYSIWYG body"
    />,
  );

  await waitFor(
    () => {
      const spans = container.querySelectorAll('pre code span[style*="color"]');
      expect(spans.length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
});

test('keeps multi-line diff code blocks as multiple lines', async () => {
  const markdown = [
    '```diff:src/example.ts',
    '@@ -1,5 +1,5 @@',
    '-export const mode = "draft";',
    '+export const mode = "published";',
    ' export const enabled = true;',
    '```',
    '',
  ].join('\n');

  const initialHtml = await markdownToHtml(markdown);

  const { container } = render(
    <TiptapEditor
      markdown={markdown}
      initialHtml={initialHtml}
      onChange={() => {}}
      className="source-editor source-editor--fused source-editor--wysiwyg znc"
      ariaLabel="WYSIWYG body"
    />,
  );

  await waitFor(
    () => {
      const code = container.querySelector('pre code');
      expect(code).not.toBeNull();
      expect(code?.textContent?.includes('\n')).toBe(true);
    },
    { timeout: 5000 },
  );
});
