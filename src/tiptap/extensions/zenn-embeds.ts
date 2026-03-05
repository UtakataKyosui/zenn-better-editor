import { Node, mergeAttributes } from '@tiptap/core';
import { primeZennEmbeddedIframe } from '../../utils/zenn-embed-runtime';

type IframeAttrs = {
  src: string;
  id: string;
  dataContent: string;
  width: string;
  style: string;
  scrolling: string;
  frameborder: string;
  loading: string;
  allow: string;
  allowfullscreen: string;
};

const EMPTY_IFRAME_ATTRS: IframeAttrs = {
  src: '',
  id: '',
  dataContent: '',
  width: '',
  style: '',
  scrolling: '',
  frameborder: '',
  loading: '',
  allow: '',
  allowfullscreen: '',
};

const getIframeAttrs = (element: Element | null): IframeAttrs => {
  if (!element) {
    return EMPTY_IFRAME_ATTRS;
  }

  return {
    src: element.getAttribute('src') || '',
    id: element.getAttribute('id') || '',
    dataContent: element.getAttribute('data-content') || '',
    width: element.getAttribute('width') || '',
    style: element.getAttribute('style') || '',
    scrolling: element.getAttribute('scrolling') || '',
    frameborder: element.getAttribute('frameborder') || '',
    loading: element.getAttribute('loading') || '',
    allow: element.getAttribute('allow') || '',
    allowfullscreen: element.getAttribute('allowfullscreen') || '',
  };
};

const assignIframeAttrs = (
  iframeAttrs: IframeAttrs,
): Record<string, string> => {
  const attrs: Record<string, string> = {};

  if (iframeAttrs.src) attrs.src = iframeAttrs.src;
  if (iframeAttrs.id) attrs.id = iframeAttrs.id;
  if (iframeAttrs.dataContent) attrs['data-content'] = iframeAttrs.dataContent;
  if (iframeAttrs.width) attrs.width = iframeAttrs.width;
  if (iframeAttrs.style) attrs.style = iframeAttrs.style;
  if (iframeAttrs.scrolling) attrs.scrolling = iframeAttrs.scrolling;
  if (iframeAttrs.frameborder) attrs.frameborder = iframeAttrs.frameborder;
  if (iframeAttrs.loading) attrs.loading = iframeAttrs.loading;
  if (iframeAttrs.allow) attrs.allow = iframeAttrs.allow;
  if (iframeAttrs.allowfullscreen) attrs.allowfullscreen = iframeAttrs.allowfullscreen;

  return attrs;
};

const decodeEmbedPayload = (value: string) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const ZennEmbedBlock = Node.create({
  name: 'zennEmbedBlock',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      className: {
        default: 'embed-block',
        parseHTML: (element) => element.getAttribute('class') || 'embed-block',
      },
      source: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-zenn-embed-source') || '',
      },
      iframeSrc: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).src,
      },
      iframeId: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).id,
      },
      iframeDataContent: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).dataContent,
      },
      iframeWidth: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).width,
      },
      iframeStyle: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).style,
      },
      iframeScrolling: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).scrolling,
      },
      iframeFrameborder: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).frameborder,
      },
      iframeLoading: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).loading,
      },
      iframeAllow: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).allow,
      },
      iframeAllowfullscreen: {
        default: '',
        parseHTML: (element) =>
          getIframeAttrs(element.querySelector('iframe')).allowfullscreen,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.embed-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as Record<string, string>;
    const spanAttrs = mergeAttributes(
      {
        class: attrs.className || 'embed-block',
      },
      attrs.source
        ? {
            'data-zenn-embed-source': attrs.source,
          }
        : {},
    );

    const iframeAttrs = assignIframeAttrs({
      src: attrs.iframeSrc || '',
      id: attrs.iframeId || '',
      dataContent: attrs.iframeDataContent || '',
      width: attrs.iframeWidth || '',
      style: attrs.iframeStyle || '',
      scrolling: attrs.iframeScrolling || '',
      frameborder: attrs.iframeFrameborder || '',
      loading: attrs.iframeLoading || '',
      allow: attrs.iframeAllow || '',
      allowfullscreen: attrs.iframeAllowfullscreen || '',
    });

    return ['span', spanAttrs, ['iframe', iframeAttrs]];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.setAttribute('contenteditable', 'false');

      const renderNode = (nextNode: typeof node) => {
        const attrs = nextNode.attrs as Record<string, string>;
        dom.className = attrs.className || 'embed-block';
        dom.innerHTML = '';

        const iframe = document.createElement('iframe');
        const iframeAttrs = assignIframeAttrs({
          src: attrs.iframeSrc || '',
          id: attrs.iframeId || '',
          dataContent: attrs.iframeDataContent || '',
          width: attrs.iframeWidth || '',
          style: attrs.iframeStyle || '',
          scrolling: attrs.iframeScrolling || '',
          frameborder: attrs.iframeFrameborder || '',
          loading: attrs.iframeLoading || '',
          allow: attrs.iframeAllow || '',
          allowfullscreen: attrs.iframeAllowfullscreen || '',
        });

        Object.entries(iframeAttrs).forEach(([key, value]) => {
          iframe.setAttribute(key, value);
        });
        dom.append(iframe);
        primeZennEmbeddedIframe(iframe);
      };

      renderNode(node);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          renderNode(updatedNode);
          return true;
        },
      };
    };
  },

  renderMarkdown(node) {
    const source = String(node.attrs.source || '').trim();
    if (source) {
      return `${source}\n`;
    }

    const payload = decodeEmbedPayload(String(node.attrs.iframeDataContent || '')).trim();
    if (payload) {
      return `${payload}\n`;
    }

    const src = String(node.attrs.iframeSrc || '').trim();
    return src ? `${src}\n` : '';
  },
});
