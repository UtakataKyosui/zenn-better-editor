import { Node, mergeAttributes } from '@tiptap/core';

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
    };
  },

  parseHTML() {
    return [{ tag: 'details.zenn-details' }, { tag: 'details' }];
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
});
