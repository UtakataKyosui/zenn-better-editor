import Image from '@tiptap/extension-image';

const escapeMarkdownText = (value: string) => {
  return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
};

const normalizeNumericAttr = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  return /^\d+$/.test(text) ? text : '';
};

export const ZennImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      inline: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'md-img',
        parseHTML: (element) => element.getAttribute('class') || 'md-img',
        renderHTML: (attributes) => ({
          class: String(attributes.class || 'md-img'),
        }),
      },
      loading: {
        default: 'eager',
        parseHTML: (element) => element.getAttribute('loading') || 'eager',
        renderHTML: (attributes) => {
          const loading = String(attributes.loading || '').trim();
          return loading ? { loading } : {};
        },
      },
    };
  },

  renderMarkdown: (node) => {
    const src = String(node.attrs.src || '').trim();
    if (!src) return '';

    const alt = escapeMarkdownText(String(node.attrs.alt || ''));
    const title = String(node.attrs.title || '').trim();
    const width = normalizeNumericAttr(node.attrs.width);
    const height = normalizeNumericAttr(node.attrs.height);
    const sizeSuffix = width || height ? ` =${width}x${height}` : '';
    const titleSuffix = title ? ` "${escapeMarkdownText(title)}"` : '';
    return `![${alt}](${src}${sizeSuffix}${titleSuffix})`;
  },

  addNodeView() {
    const fallbackSrc = '/zenn-sample-ocean.svg';

    return ({ node }) => {
      const img = document.createElement('img');
      img.setAttribute('draggable', 'true');
      img.classList.add('md-img');

      const applyAttrs = (attrs: Record<string, unknown>) => {
        const src = String(attrs.src || '').trim();
        const alt = String(attrs.alt || '');
        const title = String(attrs.title || '').trim();
        const className = String(attrs.class || 'md-img').trim();
        const loading = String(attrs.loading || 'eager').trim();
        const width = normalizeNumericAttr(attrs.width);
        const height = normalizeNumericAttr(attrs.height);

        if (className) {
          img.className = className;
        } else {
          img.className = 'md-img';
        }

        img.setAttribute('src', src);
        img.setAttribute('alt', alt);
        if (title) {
          img.setAttribute('title', title);
        } else {
          img.removeAttribute('title');
        }
        if (loading) {
          img.setAttribute('loading', loading);
        } else {
          img.removeAttribute('loading');
        }

        if (width) {
          img.setAttribute('width', width);
        } else {
          img.removeAttribute('width');
        }

        if (height) {
          img.setAttribute('height', height);
        } else {
          img.removeAttribute('height');
        }

        img.removeAttribute('data-fallback-applied');
        img.removeAttribute('data-original-src');
      };

      const handleError = () => {
        if (img.getAttribute('data-fallback-applied') === '1') {
          return;
        }

        const originalSrc = img.getAttribute('src') || '';
        img.setAttribute('data-fallback-applied', '1');
        img.setAttribute('data-original-src', originalSrc);
        img.setAttribute('src', fallbackSrc);
      };

      applyAttrs(node.attrs as Record<string, unknown>);
      img.addEventListener('error', handleError);

      return {
        dom: img,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          applyAttrs(updatedNode.attrs as Record<string, unknown>);
          return true;
        },
        destroy: () => {
          img.removeEventListener('error', handleError);
        },
      };
    };
  },
});
