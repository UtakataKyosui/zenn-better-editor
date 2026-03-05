import CodeBlock from '@tiptap/extension-code-block';
import { mergeAttributes } from '@tiptap/core';

const parseFenceInfo = (value: string) => {
  const compact = value.trim();
  if (!compact) {
    return {
      language: null as string | null,
      filename: '',
      raw: '',
    };
  }

  const tokens = compact.split(/\s+/);
  const first = tokens[0] || '';

  // Zenn diff fences often use: ```diff ts:src/example.ts
  if (first === 'diff') {
    const meta = tokens[1] || '';
    const separatorIndex = meta.indexOf(':');
    if (separatorIndex > 0) {
      return {
        language: 'diff',
        filename: meta.slice(separatorIndex + 1).trim(),
        raw: compact,
      };
    }
  }

  const separatorIndex = first.indexOf(':');
  if (separatorIndex > 0) {
    return {
      language: first.slice(0, separatorIndex).trim() || null,
      filename: first.slice(separatorIndex + 1).trim(),
      raw: compact,
    };
  }

  return {
    language: first || null,
    filename: '',
    raw: compact,
  };
};

const getFilenameFromPre = (element: HTMLElement) => {
  const fromAttr = element.getAttribute('data-zenn-filename');
  if (fromAttr?.trim()) return fromAttr.trim();

  const container = element.closest('div.code-block-container');
  const label = container?.querySelector('.code-block-filename');
  return label?.textContent?.trim() || '';
};

const getFenceInfoFromPre = (element: HTMLElement) => {
  const fromAttr = element.getAttribute('data-zenn-fence-info');
  if (fromAttr?.trim()) return fromAttr.trim();

  const filename = getFilenameFromPre(element);
  const code = element.querySelector('code');
  const languageClass = Array.from(code?.classList || []).find((className) =>
    className.startsWith('language-'),
  );
  const language = languageClass?.replace('language-', '').trim() || '';
  if (!language) return '';

  return filename ? `${language}:${filename}` : language;
};

const buildFenceInfo = (
  languageValue: unknown,
  filenameValue: unknown,
  originalInfo: unknown,
) => {
  const original = String(originalInfo || '').trim();
  if (original) return original;

  const language = String(languageValue || '').trim();
  const filename = String(filenameValue || '').trim();

  if (!language) return '';
  return filename ? `${language}:${filename}` : language;
};

export const ZennCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (element) => {
          const htmlElement = element as HTMLElement;
          const { languageClassPrefix } = this.options;

          if (languageClassPrefix) {
            const classNames = Array.from(
              htmlElement.firstElementChild?.classList || [],
            );
            const languageClass = classNames.find((className) =>
              className.startsWith(languageClassPrefix),
            );

            if (languageClass) {
              return languageClass.replace(languageClassPrefix, '') || null;
            }
          }

          const parsed = parseFenceInfo(getFenceInfoFromPre(htmlElement));
          return parsed.language;
        },
        rendered: false,
      },
      filename: {
        default: null,
        parseHTML: (element) => {
          const filename = getFilenameFromPre(element as HTMLElement);
          return filename || null;
        },
        rendered: false,
      },
      fenceInfo: {
        default: null,
        parseHTML: (element) => {
          const info = getFenceInfoFromPre(element as HTMLElement);
          return info || null;
        },
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const language = String(node.attrs.language || '').trim();
    const filename = String(node.attrs.filename || '').trim();
    const fenceInfo = buildFenceInfo(
      node.attrs.language,
      node.attrs.filename,
      node.attrs.fenceInfo,
    );
    const preAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

    delete (preAttrs as Record<string, string>).filename;
    delete (preAttrs as Record<string, string>).fenceInfo;
    delete (preAttrs as Record<string, string>).language;

    if (fenceInfo) {
      preAttrs['data-zenn-fence-info'] = fenceInfo;
    }
    if (filename) {
      preAttrs['data-zenn-filename'] = filename;
    }

    const preNode: unknown[] = [
      'pre',
      preAttrs,
      [
        'code',
        {
          class: language
            ? this.options.languageClassPrefix + language
            : null,
        },
        0,
      ],
    ];

    const children: unknown[] = [];
    if (filename) {
      children.push([
        'div',
        { class: 'code-block-filename-container' },
        ['span', { class: 'code-block-filename' }, filename],
      ]);
    }
    children.push(preNode);

    return ['div', { class: 'code-block-container' }, ...children];
  },

  parseMarkdown: (token, helpers) => {
    const raw = String(token.raw || '');
    if (!raw.startsWith('```') && token.codeBlockStyle !== 'indented') {
      return [];
    }

    const info = String(token.lang || '').trim();
    const parsed = parseFenceInfo(info);

    return helpers.createNode(
      'codeBlock',
      {
        language: parsed.language,
        filename: parsed.filename || null,
        fenceInfo: parsed.raw || null,
      },
      token.text ? [helpers.createTextNode(token.text)] : [],
    );
  },

  renderMarkdown: (node, helpers) => {
    const info = buildFenceInfo(
      node.attrs?.language,
      node.attrs?.filename,
      node.attrs?.fenceInfo,
    );
    const openingFence = `\`\`\`${info}`;

    if (!node.content) {
      return `${openingFence}

\`\`\``;
    }

    return [openingFence, helpers.renderChildren(node.content), '```'].join('\n');
  },
});
