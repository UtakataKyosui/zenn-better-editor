import { describe, expect, it } from '@rstest/core';
import markdownToHtml from 'zenn-markdown-html';
import { normalizeZennHtmlForTiptap } from '../../src/utils/zenn-html';

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
});
