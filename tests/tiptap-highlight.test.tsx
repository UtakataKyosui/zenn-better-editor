import { expect, test } from '@rstest/core';
import { fireEvent, render, waitFor } from '@testing-library/react';
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

test('renders markdown tables as table elements in wysiwyg', async () => {
  const markdown = [
    '| Head | Head | Head |',
    '| ---- | ---- | ---- |',
    '| Text | Text | Text |',
    '| Text | Text | Text |',
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
      const table = container.querySelector('table');
      expect(table).not.toBeNull();
      expect(table?.querySelectorAll('th').length).toBe(3);
      expect(table?.querySelectorAll('td').length).toBe(6);
    },
    { timeout: 5000 },
  );
});

test('shows mermaid preview widget for mermaid code blocks', async () => {
  const markdown = ['```mermaid', 'graph TD', 'A-->B', '```', ''].join('\n');
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
      expect(container.querySelector('.tiptap-mermaid-preview')).not.toBeNull();
    },
    { timeout: 5000 },
  );
});

test('opens a mermaid edit modal from preview widget', async () => {
  const markdown = ['```mermaid', 'graph TD', 'A-->B', '```', ''].join('\n');
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
      expect(container.querySelector('.tiptap-mermaid-preview__edit')).not.toBeNull();
    },
    { timeout: 5000 },
  );

  const editButton = container.querySelector(
    '.tiptap-mermaid-preview__edit',
  ) as HTMLButtonElement;
  fireEvent.click(editButton);

  await waitFor(() => {
    const textarea = container.querySelector(
      '.tiptap-mermaid-modal__input',
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('graph TD');
  });
});

test('opens mermaid modal with mermaid source even when ts blocks exist', async () => {
  const markdown = [
    '```mermaid',
    'graph TD',
    'A-->B',
    '```',
    '',
    '```ts',
    'export const previewTarget = {',
    "  mode: 'markdown-direct',",
    "  renderer: 'zenn-markdown-html',",
    "  target: 'all-patterns-from-markdown-guide',",
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
      expect(container.querySelector('.tiptap-mermaid-preview__edit')).not.toBeNull();
    },
    { timeout: 5000 },
  );

  const editButton = container.querySelector(
    '.tiptap-mermaid-preview__edit',
  ) as HTMLButtonElement;
  fireEvent.click(editButton);

  await waitFor(() => {
    const textarea = container.querySelector(
      '.tiptap-mermaid-modal__input',
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('graph TD');
    expect(textarea?.value).not.toContain('previewTarget');
  });
});

test('keeps mermaid preview available for untyped mermaid-like code blocks', async () => {
  const markdown = ['```', 'graph TD', 'A-->B', '```', ''].join('\n');
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
      expect(container.querySelector('.tiptap-mermaid-preview__edit')).not.toBeNull();
    },
    { timeout: 5000 },
  );

  const editButton = container.querySelector(
    '.tiptap-mermaid-preview__edit',
  ) as HTMLButtonElement;
  fireEvent.click(editButton);

  await waitFor(() => {
    const textarea = container.querySelector(
      '.tiptap-mermaid-modal__input',
    ) as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('graph TD');
  });
});

test('shows mermaid preview when the fence info has a title suffix', async () => {
  const markdown = [
    '```mermaid:architecture.mmd',
    'graph TD',
    'A-->B',
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
      expect(container.querySelector('.tiptap-mermaid-preview__edit')).not.toBeNull();
    },
    { timeout: 5000 },
  );
});

test('keeps mermaid preview for init directive blocks without an explicit language', async () => {
  const markdown = [
    '```',
    "%%{init: {'theme':'default'}}%%",
    'graph TD',
    'A-->B',
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
      expect(container.querySelector('.tiptap-mermaid-preview__edit')).not.toBeNull();
    },
    { timeout: 5000 },
  );
});

test('renders zenn embed blocks inside wysiwyg editor', async () => {
  const markdown = '@[card](https://zenn.dev/zenn/articles/markdown-guide)\n';
  const initialHtml =
    '<p><span class="embed-block zenn-embedded zenn-embedded-card" data-zenn-embed-source="@[card](https://zenn.dev/zenn/articles/markdown-guide)"><iframe id="zenn-embedded__card" data-content="https%3A%2F%2Fzenn.dev%2Fzenn%2Farticles%2Fmarkdown-guide"></iframe></span></p>';

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
      const iframe = container.querySelector(
        '.embed-block.zenn-embedded-card iframe',
      ) as HTMLIFrameElement | null;
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('data-content')).toContain(
        'https%3A%2F%2Fzenn.dev%2Fzenn%2Farticles%2Fmarkdown-guide',
      );
    },
    { timeout: 5000 },
  );
});

test('toggles zenn details by clicking summary in wysiwyg', async () => {
  const markdown = [':::details タイトル', '表示したい内容', ':::', ''].join('\n');
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
      expect(container.querySelector('details.zenn-details summary')).not.toBeNull();
    },
    { timeout: 5000 },
  );

  const details = container.querySelector('details.zenn-details');
  const summary = container.querySelector(
    'details.zenn-details summary',
  ) as HTMLElement | null;

  expect(details?.hasAttribute('open')).toBe(false);
  fireEvent.click(summary as HTMLElement);

  await waitFor(() => {
    expect(details?.hasAttribute('open')).toBe(true);
  });

  fireEvent.click(summary as HTMLElement);
  await waitFor(() => {
    expect(details?.hasAttribute('open')).toBe(false);
  });
});
