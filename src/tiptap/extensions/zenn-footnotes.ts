import { Node } from '@tiptap/core';

type FootnoteItem = {
  label: string;
  index: number;
  content: string;
  footnoteId: string;
  refId: string;
};

const normalizeLabel = (value: string) => {
  const normalized = value.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-');
  return normalized || '1';
};

const parseItems = (value: unknown): FootnoteItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as FootnoteItem[];

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? (parsed as FootnoteItem[]) : [];
  } catch {
    return [];
  }
};

export const ZennFootnoteReference = Node.create({
  name: 'zennFootnoteReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      label: {
        default: '1',
        parseHTML: (element) => {
          const anchor = element.querySelector('a');
          const href = anchor?.getAttribute('href') || '';
          const id = href.startsWith('#') ? href.slice(1) : href;
          return normalizeLabel(id.replace(/^fn-/, '') || '1');
        },
      },
      index: {
        default: 1,
        parseHTML: (element) => {
          const text = element.querySelector('a')?.textContent || '';
          const matched = text.match(/\[(\d+)\]/);
          const parsed = Number(matched?.[1] || 1);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        },
      },
      footnoteId: {
        default: 'fn-1',
        parseHTML: (element) => {
          const anchor = element.querySelector('a');
          const href = anchor?.getAttribute('href') || '';
          if (href.startsWith('#') && href.length > 1) {
            return href.slice(1);
          }
          return 'fn-1';
        },
      },
      refId: {
        default: 'fnref-1',
        parseHTML: (element) => {
          const id = element.querySelector('a')?.getAttribute('id') || '';
          return id || 'fnref-1';
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup.footnote-ref' }];
  },

  renderHTML({ HTMLAttributes }) {
    const label = normalizeLabel(String(HTMLAttributes.label || '1'));
    const index = Number(HTMLAttributes.index || 1) || 1;
    const footnoteId = String(HTMLAttributes.footnoteId || `fn-${label}`);
    const refId = String(HTMLAttributes.refId || `fnref-${label}`);

    return [
      'sup',
      { class: 'footnote-ref' },
      ['a', { href: `#${footnoteId}`, id: refId }, `[${index}]`],
    ];
  },

  // biome-ignore lint/suspicious/noExplicitAny: markdown serializer types are dynamic
  renderMarkdown: (node: any) => {
    const label = normalizeLabel(
      String(node.attrs?.label || node.attrs?.index || '1'),
    );
    return `[^${label}]`;
  },
});

export const ZennFootnotesSection = Node.create({
  name: 'zennFootnotesSection',
  group: 'block',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      items: {
        default: '[]',
        parseHTML: (element) => {
          const listItems = Array.from(
            element.querySelectorAll('ol.footnotes-list > li.footnote-item'),
          );
          const parsed = listItems.map((item, i) => {
            const id = item.getAttribute('id') || `fn-${i + 1}`;
            const safeLabel = normalizeLabel(
              id.replace(/^fn-/, '') || String(i + 1),
            );
            const backref = item.querySelector('a.footnote-backref');
            const paragraph = item.querySelector('p');
            const content = (paragraph?.textContent || '')
              .replace(backref?.textContent || '', '')
              .trim();
            return {
              label: safeLabel,
              index: i + 1,
              content,
              footnoteId: id,
              refId: `fnref-${safeLabel}`,
            } satisfies FootnoteItem;
          });

          return JSON.stringify(parsed);
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section.footnotes' }];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('section');
      dom.className = 'footnotes tiptap-footnotes-editor';
      dom.setAttribute('contenteditable', 'false');

      const title = document.createElement('span');
      title.className = 'footnotes-title';
      title.textContent = '脚注';

      const list = document.createElement('ol');
      list.className = 'footnotes-list';

      const nodeTypeName = this.name;
      const resolveNodePos = () => {
        if (typeof getPos === 'function') {
          const pos = getPos();
          const candidate = editor.state.doc.nodeAt(pos);
          if (candidate?.type.name === nodeTypeName) {
            return pos;
          }
        } else if (typeof getPos === 'number') {
          const candidate = editor.state.doc.nodeAt(getPos);
          if (candidate?.type.name === nodeTypeName) {
            return getPos;
          }
        }

        let foundPos: number | null = null;
        editor.state.doc.descendants((descendant, pos) => {
          if (descendant.type.name === nodeTypeName) {
            foundPos = pos;
            return false;
          }
          return true;
        });
        return foundPos;
      };

      const updateItem = (label: string, content: string) => {
        const pos = resolveNodePos();
        if (typeof pos !== 'number') return;
        const currentNode = editor.state.doc.nodeAt(pos);
        if (!currentNode || currentNode.type.name !== this.name) return;

        const items = parseItems(currentNode.attrs.items);
        const nextItems = items.map((item) =>
          item.label === label ? { ...item, content } : item,
        );
        const nextSerialized = JSON.stringify(nextItems);
        if (nextSerialized === String(currentNode.attrs.items || '[]')) {
          return;
        }

        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...currentNode.attrs,
          items: nextSerialized,
        });
        editor.view.dispatch(tr);
      };

      const renderItems = (items: FootnoteItem[]) => {
        list.innerHTML = '';
        items.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'footnote-item';
          li.id = item.footnoteId || `fn-${normalizeLabel(item.label)}`;

          const paragraph = document.createElement('p');
          const label = document.createElement('span');
          label.className = 'tiptap-footnote-label';
          label.textContent = `[${item.index}] `;

          const textarea = document.createElement('textarea');
          textarea.className = 'tiptap-footnote-input';
          textarea.value = item.content || '';
          textarea.rows = 1;
          textarea.spellcheck = false;
          textarea.setAttribute('aria-label', `Footnote ${item.index} content`);
          textarea.addEventListener('mousedown', (event) =>
            event.stopPropagation(),
          );
          textarea.addEventListener('keydown', (event) =>
            event.stopPropagation(),
          );
          textarea.addEventListener('blur', () => {
            updateItem(item.label, textarea.value.trim());
          });

          const backref = document.createElement('a');
          backref.className = 'footnote-backref';
          backref.href = `#${item.refId || `fnref-${normalizeLabel(item.label)}`}`;
          backref.textContent = '↩︎';

          paragraph.append(
            label,
            textarea,
            document.createTextNode(' '),
            backref,
          );
          li.append(paragraph);
          list.append(li);
        });
      };

      dom.append(title, list);
      renderItems(parseItems(node.attrs.items));

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          renderItems(parseItems(updatedNode.attrs.items));
          return true;
        },
        stopEvent: (event) => {
          const target = event.target as HTMLElement | null;
          return Boolean(target?.closest('.tiptap-footnotes-editor'));
        },
        ignoreMutation: () => true,
      };
    };
  },

  renderHTML({ HTMLAttributes }) {
    const items = parseItems(HTMLAttributes.items);
    const listChildren = items.map((item) => {
      const footnoteId = item.footnoteId || `fn-${normalizeLabel(item.label)}`;
      const refId = item.refId || `fnref-${normalizeLabel(item.label)}`;
      return [
        'li',
        {
          id: footnoteId,
          class: 'footnote-item',
        },
        [
          'p',
          {},
          item.content || '',
          ' ',
          ['a', { href: `#${refId}`, class: 'footnote-backref' }, '↩︎'],
        ],
      ];
    });

    return [
      'section',
      { class: 'footnotes' },
      ['span', { class: 'footnotes-title' }, '脚注'],
      ['ol', { class: 'footnotes-list' }, ...listChildren],
    ];
  },

  // biome-ignore lint/suspicious/noExplicitAny: markdown serializer types are dynamic
  renderMarkdown: (node: any) => {
    const items = parseItems(node.attrs?.items);
    if (items.length === 0) return '';
    return items
      .map((item) => `[^${item.label}]: ${item.content || ''}`)
      .join('\n');
  },
});
