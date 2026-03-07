import { describe, expect, it } from '@rstest/core';
import markdownToHtml from 'zenn-markdown-html';
import { normalizeZennHtmlForTiptap } from '../../src/tiptap/zenn-html';

describe('zenn html normalization', () => {
  it('keeps mermaid language on the mermaid block when mixed with shiki blocks', async () => {
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

    const html = await markdownToHtml(markdown);
    const normalized = normalizeZennHtmlForTiptap(html, markdown);
    const doc = new DOMParser().parseFromString(
      `<div id="root">${normalized}</div>`,
      'text/html',
    );
    const root = doc.getElementById('root');
    const codeNodes = Array.from(
      root?.querySelectorAll('div.code-block-container > pre > code') ?? [],
    );

    expect(codeNodes).toHaveLength(2);
    expect(codeNodes[0]?.classList.contains('language-mermaid')).toBe(true);
    expect(codeNodes[1]?.classList.contains('language-ts')).toBe(true);
    expect(codeNodes[1]?.classList.contains('language-mermaid')).toBe(false);
  });

  it('converts embed-origin mermaid iframes into mermaid code blocks', async () => {
    const markdown = ['```mermaid', 'graph TD', 'A-->B', '```', ''].join('\n');
    const html = `<span class="embed-block zenn-embedded zenn-embedded-mermaid"><iframe id="zenn-embedded__test" data-content="${encodeURIComponent('graph TD\nA-->B')}" frameborder="0" scrolling="no" loading="lazy"></iframe></span>`;
    const normalized = normalizeZennHtmlForTiptap(html, markdown);
    const doc = new DOMParser().parseFromString(
      `<div id="root">${normalized}</div>`,
      'text/html',
    );
    const root = doc.getElementById('root');
    const mermaidCode = root?.querySelector(
      'div.code-block-container > pre > code.language-mermaid',
    );

    expect(mermaidCode).not.toBeNull();
    expect(mermaidCode?.textContent).toContain('graph TD');
  });

  it('annotates embed blocks with original markdown source and removes hidden fallback links', () => {
    const markdown = '@[card](https://zenn.dev/zenn/articles/markdown-guide)\n';
    const html = `<p><span class="embed-block zenn-embedded zenn-embedded-card"><iframe id="zenn-embedded__card" data-content="${encodeURIComponent('https://zenn.dev/zenn/articles/markdown-guide')}"></iframe></span><a href="https://zenn.dev/zenn/articles/markdown-guide" style="display:none">https://zenn.dev/zenn/articles/markdown-guide</a></p>`;
    const normalized = normalizeZennHtmlForTiptap(html, markdown);
    const doc = new DOMParser().parseFromString(
      `<div id="root">${normalized}</div>`,
      'text/html',
    );
    const root = doc.getElementById('root');
    const embedBlock = root?.querySelector('span.embed-block');
    const hiddenFallback = root?.querySelector('a[style*="display:none"]');

    expect(embedBlock).not.toBeNull();
    expect(embedBlock?.getAttribute('data-zenn-embed-source')).toBe(
      '@[card](https://zenn.dev/zenn/articles/markdown-guide)',
    );
    expect(hiddenFallback).toBeNull();
  });

  it('forces eager loading for markdown images in the editor html', async () => {
    const markdown =
      '![](https://storage.googleapis.com/zenn-user-upload/topics/a0d4d7f86a.jpeg)\n';
    const html = await markdownToHtml(markdown);
    const normalized = normalizeZennHtmlForTiptap(html, markdown);
    const doc = new DOMParser().parseFromString(
      `<div id="root">${normalized}</div>`,
      'text/html',
    );
    const image = doc.querySelector('img.md-img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('loading')).toBe('eager');
    expect(image?.getAttribute('decoding')).toBe('async');
  });
});
