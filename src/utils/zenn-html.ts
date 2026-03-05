const trimLatex = (value: string | null | undefined) => {
  return (value || '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').trim();
};

const parseFenceLanguage = (fenceInfo: string) => {
  const compactInfo = fenceInfo.trim();
  if (!compactInfo) return '';

  // Zenn supports code title syntax like: ```ts:src/example.ts
  const headToken = compactInfo.split(/\s+/)[0] || '';
  const language = headToken.split(':')[0] || '';
  return language.toLowerCase();
};

const extractFencedLanguages = (markdown: string) => {
  const languages: string[] = [];
  const pattern = /^```([^\r\n]*)[\t ]*\r?\n[\s\S]*?^```[\t ]*$/gm;
  let match = pattern.exec(markdown);

  while (match) {
    const language = parseFenceLanguage(match[1]);
    languages.push(language);
    match = pattern.exec(markdown);
  }

  return languages;
};

const injectCodeLanguages = (root: HTMLElement, markdown: string) => {
  const languages = extractFencedLanguages(markdown);
  if (languages.length === 0) return;

  const codeNodes = Array.from(
    root.querySelectorAll('div.code-block-container > pre.shiki > code'),
  );

  codeNodes.forEach((codeNode, index) => {
    const language = languages[index];
    if (!language) return;
    codeNode.classList.add(`language-${language}`);
  });
};

const flattenShikiCodeToPlainText = (root: HTMLElement) => {
  const codeNodes = Array.from(
    root.querySelectorAll('div.code-block-container > pre.shiki > code'),
  );

  codeNodes.forEach((codeNode) => {
    const lineNodes = Array.from(codeNode.querySelectorAll(':scope > span.line'));
    if (lineNodes.length === 0) return;

    const lines = lineNodes.map((lineNode) => lineNode.textContent || '');
    if (lines.length > 0 && lines.at(-1) === '') {
      lines.pop();
    }

    codeNode.textContent = lines.join('\n');
  });
};

const convertZennMathNodes = (root: HTMLElement) => {
  const blockEmbeds = Array.from(
    root.querySelectorAll('section.zenn-katex embed-katex[display-mode]'),
  );

  blockEmbeds.forEach((embedNode) => {
    const block = root.ownerDocument.createElement('div');
    block.setAttribute('data-type', 'block-math');
    block.setAttribute('data-latex', trimLatex(embedNode.textContent));

    const section = embedNode.closest('section.zenn-katex');
    if (section) {
      section.replaceWith(block);
    }
  });

  const inlineEmbeds = Array.from(root.querySelectorAll('embed-katex'));
  inlineEmbeds.forEach((embedNode) => {
    if (embedNode.closest('section.zenn-katex')) return;

    const inline = root.ownerDocument.createElement('span');
    inline.setAttribute('data-type', 'inline-math');
    inline.setAttribute('data-latex', trimLatex(embedNode.textContent));
    embedNode.replaceWith(inline);
  });
};

export const normalizeZennHtmlForTiptap = (
  html: string,
  markdown = '',
): string => {
  if (!html.trim() || typeof DOMParser === 'undefined') {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="znc-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('znc-root');

    if (!root) {
      return html;
    }

    flattenShikiCodeToPlainText(root);
    injectCodeLanguages(root, markdown);
    convertZennMathNodes(root);

    return root.innerHTML;
  } catch {
    return html;
  }
};
