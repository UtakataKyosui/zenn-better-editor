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
});
