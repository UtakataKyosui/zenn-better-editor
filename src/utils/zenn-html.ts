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

const normalizeCodeContent = (value: string) => {
  return value.replace(/\r\n?/g, '\n').trimEnd();
};

type FencedBlock = {
  fenceInfo: string;
  language: string;
  filename: string;
  content: string;
};

const EMBED_ONLY_LINE_PATTERN = /^(@\[[\w-]+\]\(.+\)|https?:\/\/\S+)$/gim;

const parseFenceMetadata = (fenceInfo: string) => {
  const compact = fenceInfo.trim();
  if (!compact) {
    return {
      language: '',
      filename: '',
      fenceInfo: '',
    };
  }

  const tokens = compact.split(/\s+/);
  const first = tokens[0] || '';

  if (first === 'diff') {
    const secondary = tokens[1] || '';
    const separatorIndex = secondary.indexOf(':');
    return {
      language: 'diff',
      filename: separatorIndex > 0 ? secondary.slice(separatorIndex + 1).trim() : '',
      fenceInfo: compact,
    };
  }

  const separatorIndex = first.indexOf(':');
  if (separatorIndex > 0) {
    return {
      language: first.slice(0, separatorIndex).trim(),
      filename: first.slice(separatorIndex + 1).trim(),
      fenceInfo: compact,
    };
  }

  return {
    language: first,
    filename: '',
    fenceInfo: compact,
  };
};

const extractFencedBlocks = (markdown: string): FencedBlock[] => {
  const blocks: FencedBlock[] = [];
  const pattern = /^```([^\r\n]*)[\t ]*\r?\n([\s\S]*?)^```[\t ]*$/gm;
  let match = pattern.exec(markdown);

  while (match) {
    const metadata = parseFenceMetadata(match[1] || '');
    const language = metadata.language || parseFenceLanguage(match[1]);
    const content = normalizeCodeContent(match[2] || '');
    blocks.push({
      fenceInfo: metadata.fenceInfo,
      language,
      filename: metadata.filename,
      content,
    });
    match = pattern.exec(markdown);
  }

  return blocks;
};

const extractEmbedSourceLines = (markdown: string) => {
  const matches = markdown.match(EMBED_ONLY_LINE_PATTERN);
  return (matches || []).map((line) => line.trim());
};

const annotateEmbedSources = (root: HTMLElement, markdown: string) => {
  const sources = extractEmbedSourceLines(markdown);
  if (sources.length === 0) return;

  const blocks = Array.from(
    root.querySelectorAll('span.embed-block:not(.zenn-embedded-mermaid)'),
  );
  if (blocks.length === 0) return;

  blocks.forEach((block, index) => {
    const source = sources[index];
    if (!source) return;
    block.setAttribute('data-zenn-embed-source', source);
  });
};

const removeEmbedFallbackLinks = (root: HTMLElement) => {
  const hiddenLinks = Array.from(
    root.querySelectorAll('a[style*="display:none"]'),
  );

  hiddenLinks.forEach((link) => {
    const parent = link.parentElement;
    if (!parent) return;

    if (parent.querySelector('span.embed-block')) {
      link.remove();
    }
  });
};

const injectCodeLanguages = (root: HTMLElement, markdown: string) => {
  const fencedBlocks = extractFencedBlocks(markdown);
  if (fencedBlocks.length === 0) return;

  const codeNodes = Array.from(
    root.querySelectorAll('div.code-block-container > pre > code'),
  );
  const usedBlockIndexes = new Set<number>();
  let fallbackCursor = 0;

  codeNodes.forEach((codeNode) => {
    const codeContent = normalizeCodeContent(codeNode.textContent || '');
    let blockIndex = fencedBlocks.findIndex(
      (block, index) =>
        !usedBlockIndexes.has(index) && block.content === codeContent,
    );

    if (blockIndex < 0) {
      while (usedBlockIndexes.has(fallbackCursor)) {
        fallbackCursor += 1;
      }
      blockIndex = fallbackCursor;
    }

    const block = fencedBlocks[blockIndex];
    fallbackCursor = Math.max(fallbackCursor, blockIndex + 1);
    if (!block) return;
    usedBlockIndexes.add(blockIndex);

    const language = block.language;
    if (language) {
      codeNode.classList.add(`language-${language}`);
    }

    const preNode = codeNode.closest('pre');
    if (!preNode) return;
    if (block.fenceInfo) {
      preNode.setAttribute('data-zenn-fence-info', block.fenceInfo);
    }
    if (block.filename) {
      preNode.setAttribute('data-zenn-filename', block.filename);
    }
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

const decodeMermaidPayload = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const convertMermaidEmbedsToCodeBlocks = (root: HTMLElement) => {
  const embeds = Array.from(
    root.querySelectorAll(
      'span.embed-block.zenn-embedded-mermaid iframe[data-content]',
    ),
  );

  embeds.forEach((iframeNode) => {
    const encoded = iframeNode.getAttribute('data-content') || '';
    const source = decodeMermaidPayload(encoded).replace(/\r\n?/g, '\n');
    const container = root.ownerDocument.createElement('div');
    const pre = root.ownerDocument.createElement('pre');
    const code = root.ownerDocument.createElement('code');

    container.className = 'code-block-container';
    code.classList.add('language-mermaid');
    code.textContent = source;

    pre.append(code);
    container.append(pre);

    const wrapper = iframeNode.closest('span.embed-block.zenn-embedded-mermaid');
    if (wrapper) {
      wrapper.replaceWith(container);
    } else {
      iframeNode.replaceWith(container);
    }
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

const normalizeImageLoading = (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll('img.md-img'));
  images.forEach((image) => {
    // Native lazy-loading can miss updates inside nested editable scrollers.
    // Force eager loading in the editor surface so previews appear reliably.
    image.setAttribute('loading', 'eager');
    image.setAttribute('decoding', 'async');
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
    convertMermaidEmbedsToCodeBlocks(root);
    annotateEmbedSources(root, markdown);
    removeEmbedFallbackLinks(root);
    injectCodeLanguages(root, markdown);
    convertZennMathNodes(root);
    normalizeImageLoading(root);

    return root.innerHTML;
  } catch {
    return html;
  }
};
