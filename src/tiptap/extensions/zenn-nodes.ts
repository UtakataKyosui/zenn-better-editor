import { Node, mergeAttributes } from '@tiptap/core';

const CONTAINER_OPEN_PATTERN = /^:::(message|details)(?:\s+.*)?$/;
const CONTAINER_CLOSE_PATTERN = /^:::\s*$/;

const parseContainerBlocks = (
  src: string,
  // biome-ignore lint/suspicious/noExplicitAny: Markdown tokenizer helper type
  lexer: any,
  containerName: 'message' | 'details',
) => {
  const openingPattern =
    containerName === 'message'
      ? /^:::message(?:\s+([^\n]*))?\s*(?:\n|$)/
      : /^:::details(?:\s+([^\n]*))?\s*(?:\n|$)/;
  const openingMatch = src.match(openingPattern);
  if (!openingMatch) return undefined;

  const openingRaw = openingMatch[0];
  const parameter = (openingMatch[1] || '').trim();
  let level = 1;
  let cursor = openingRaw.length;

  while (cursor <= src.length) {
    const newlineIndex = src.indexOf('\n', cursor);
    const hasNewline = newlineIndex >= 0;
    const lineEnd = hasNewline ? newlineIndex : src.length;
    const line = src.slice(cursor, lineEnd);
    const trimmed = line.trim();

    if (CONTAINER_OPEN_PATTERN.test(trimmed)) {
      level += 1;
    } else if (CONTAINER_CLOSE_PATTERN.test(trimmed)) {
      level -= 1;

      if (level === 0) {
        const rawEnd = hasNewline ? lineEnd + 1 : lineEnd;
        const raw = src.slice(0, rawEnd);
        const rawContent = src.slice(openingRaw.length, cursor).replace(/\n$/, '');
        const tokens = rawContent ? lexer.blockTokens(rawContent) : [];

        tokens.forEach((token: { text?: string; tokens?: unknown[] }) => {
          if (token.text && (!token.tokens || token.tokens.length === 0)) {
            token.tokens = lexer.inlineTokens(token.text);
          }
        });

        return {
          raw,
          parameter,
          tokens,
        };
      }
    }

    if (!hasNewline) {
      break;
    }

    cursor = lineEnd + 1;
  }

  return undefined;
};

/**
 * ZennMessage extension for Tiptap.
 *
 * Handles Zenn's `:::message` container directive.
 * Renders as a styled callout box in the WYSIWYG editor.
 *
 * Markdown input:
 *   :::message
 *   Some text here
 *   :::
 *
 * Also supports `:::message alert` variant.
 */
export const ZennMessage = Node.create({
  name: 'zennMessage',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (element) => {
          const className = element.getAttribute('class') || '';
          if (className.includes('alert')) return 'alert';
          return element.getAttribute('data-variant') || 'info';
        },
        renderHTML: (attributes) => ({
          'data-variant': attributes.variant,
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.zenn-message' },
      { tag: 'aside.msg' },
    ];
  },

  markdownTokenizer: {
    name: 'zennMessage',
    level: 'block',
    start: (src: string) => src.indexOf(':::message'),
    // biome-ignore lint/suspicious/noExplicitAny: Markdown token type from parser
    tokenize: (src: string, _tokens: any[], lexer: any) => {
      const parsed = parseContainerBlocks(src, lexer, 'message');
      if (!parsed) return undefined;

      const variant = parsed.parameter === 'alert' ? 'alert' : 'info';

      return {
        type: 'zennMessage',
        raw: parsed.raw,
        attributes: {
          variant,
        },
        tokens: parsed.tokens,
      };
    },
  },

  // biome-ignore lint/suspicious/noExplicitAny: Markdown token/helper types are dynamic
  parseMarkdown: (token: any, helpers: any) => {
    const children = helpers.parseChildren(token.tokens || []);
    return helpers.createNode(
      'zennMessage',
      {
        variant: token.attributes?.variant || 'info',
      },
      children.length > 0 ? children : [helpers.createNode('paragraph', {}, [])],
    );
  },

  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes['data-variant'] || 'info';
    const className = variant === 'alert' ? 'msg alert' : 'msg message';

    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        class: className,
      }),
      ['span', { class: 'msg-symbol' }, '!'],
      ['div', { class: 'msg-content' }, 0],
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Allow Enter at the end to exit the container
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if we're in a zennMessage node
        const node = $from.node(-1);
        if (node?.type.name !== this.name) return false;

        // If the current block is empty, exit the container
        const currentBlock = $from.parent;
        if (currentBlock.textContent === '') {
          return editor.commands.exitCode();
        }

        return false;
      },
    };
  },

  // biome-ignore lint/suspicious/noExplicitAny: Markdown node/helper types are dynamic
  renderMarkdown: (node: any, helpers: any) => {
    const variant = String(node.attrs?.variant || 'info');
    const variantSuffix = variant === 'alert' ? ' alert' : '';
    const content = helpers.renderChildren(node.content || [], '\n\n');
    const body = content ? `${content}\n` : '';
    return `:::message${variantSuffix}\n${body}:::\n`;
  },
});

/**
 * ZennDetails extension for Tiptap.
 *
 * Handles Zenn's `:::details title` container directive.
 * Renders as a collapsible <details> element.
 *
 * Markdown input:
 *   :::details Click to expand
 *   Hidden content
 *   :::
 */
export const ZennDetails = Node.create({
  name: 'zennDetails',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: 'Details',
        parseHTML: (element) =>
          element.querySelector('summary')?.textContent ||
          element.getAttribute('data-summary') ||
          'Details',
        renderHTML: (attributes) => ({
          'data-summary': attributes.summary,
        }),
      },
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => (attributes.open ? { open: '' } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details.zenn-details' }, { tag: 'details' }];
  },

  markdownTokenizer: {
    name: 'zennDetails',
    level: 'block',
    start: (src: string) => src.indexOf(':::details'),
    // biome-ignore lint/suspicious/noExplicitAny: Markdown token type from parser
    tokenize: (src: string, _tokens: any[], lexer: any) => {
      const parsed = parseContainerBlocks(src, lexer, 'details');
      if (!parsed) return undefined;

      return {
        type: 'zennDetails',
        raw: parsed.raw,
        attributes: {
          summary: parsed.parameter || 'Details',
          open: false,
        },
        tokens: parsed.tokens,
      };
    },
  },

  // biome-ignore lint/suspicious/noExplicitAny: Markdown token/helper types are dynamic
  parseMarkdown: (token: any, helpers: any) => {
    const children = helpers.parseChildren(token.tokens || []);
    return helpers.createNode(
      'zennDetails',
      {
        summary: token.attributes?.summary || 'Details',
        open: Boolean(token.attributes?.open),
      },
      children.length > 0 ? children : [helpers.createNode('paragraph', {}, [])],
    );
  },

  renderHTML({ HTMLAttributes }) {
    const summary = HTMLAttributes['data-summary'] || 'Details';
    return [
      'details',
      mergeAttributes(HTMLAttributes, {
        class: 'zenn-details',
      }),
      ['summary', {}, summary],
      ['div', { class: 'details-content' }, 0],
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('details');
      dom.className = 'zenn-details';

      const summary = document.createElement('summary');
      summary.setAttribute('contenteditable', 'false');
      summary.setAttribute('tabindex', '0');

      const contentDOM = document.createElement('div');
      contentDOM.className = 'details-content';
      const syncFromNode = (nextNode: typeof node) => {
        summary.textContent = String(nextNode.attrs.summary || 'Details');
        dom.open = Boolean(nextNode.attrs.open);
      };

      const updateOpenAttr = (nextOpen: boolean) => {
        const pos = typeof getPos === 'function' ? getPos() : getPos;
        if (typeof pos !== 'number') return;

        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode || currentNode.type.name !== this.name) return;
        if (Boolean(currentNode.attrs.open) === nextOpen) return;

        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          open: nextOpen,
        });
        editor.view.dispatch(tr);
      };

      syncFromNode(node);
      dom.append(summary, contentDOM);

      const handleSummaryToggle = (event: MouseEvent | KeyboardEvent) => {
        event.preventDefault();
        event.stopPropagation();
        updateOpenAttr(!dom.open);
      };

      const handleSummaryKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        handleSummaryToggle(event);
      };

      summary.addEventListener('click', handleSummaryToggle);
      summary.addEventListener('keydown', handleSummaryKeyDown);

      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          syncFromNode(updatedNode);
          return true;
        },
        stopEvent: (event) => {
          const target = event.target as HTMLElement | null;
          return Boolean(target?.closest('summary'));
        },
        destroy: () => {
          summary.removeEventListener('click', handleSummaryToggle);
          summary.removeEventListener('keydown', handleSummaryKeyDown);
        },
      };
    };
  },

  // biome-ignore lint/suspicious/noExplicitAny: Markdown node/helper types are dynamic
  renderMarkdown: (node: any, helpers: any) => {
    const summary = String(node.attrs?.summary || 'Details').trim() || 'Details';
    const content = helpers.renderChildren(node.content || [], '\n\n');
    const body = content ? `${content}\n` : '';
    return `:::details ${summary}\n${body}:::\n`;
  },
});
