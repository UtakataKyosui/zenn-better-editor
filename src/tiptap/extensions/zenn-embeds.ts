import { mergeAttributes, Node } from '@tiptap/core';
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
  if (iframeAttrs.allowfullscreen)
    attrs.allowfullscreen = iframeAttrs.allowfullscreen;

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

const EMBED_LINE_PATTERN =
  /^(?:@\[([\w-]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/\S+))[ \t]*(?:\n|$)/;

const getEmbedSourcePayload = (source: string) => {
  const trimmed = source.trim();
  const explicit = trimmed.match(/^@\[[\w-]+\]\((.+)\)$/);
  if (explicit) {
    return explicit[1].trim();
  }
  return trimmed;
};

const getEmbedKind = (source: string) => {
  const explicit = source.trim().match(/^@\[([\w-]+)\]\(.+\)$/);
  return (explicit?.[1] || 'card').toLowerCase();
};

const buildEmbedClassName = (kind: string) =>
  `embed-block zenn-embedded zenn-embedded-${kind}`;

const buildEmbedIframeId = (kind: string) => `zenn-embedded__${kind}`;

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

  markdownTokenizer: {
    name: 'zennEmbedBlock',
    level: 'block',
    start: (src: string) => {
      const explicitIndex = src.indexOf('@[');
      const urlMatch = src.match(/https?:\/\//);
      const urlIndex =
        typeof urlMatch?.index === 'number'
          ? urlMatch.index
          : Number.POSITIVE_INFINITY;

      if (explicitIndex < 0 && !Number.isFinite(urlIndex)) {
        return -1;
      }

      if (explicitIndex < 0) {
        return urlIndex;
      }

      return Math.min(explicitIndex, urlIndex);
    },
    // biome-ignore lint/suspicious/noExplicitAny: Markdown token type from parser
    tokenize: (src: string) => {
      const match = src.match(EMBED_LINE_PATTERN);
      if (!match) return undefined;

      const source = match[0].trim();
      const kind = getEmbedKind(source);
      const payload = getEmbedSourcePayload(source);

      return {
        type: 'zennEmbedBlock',
        raw: match[0],
        attributes: {
          source,
          className: buildEmbedClassName(kind),
          iframeId: buildEmbedIframeId(kind),
          iframeDataContent: encodeURIComponent(payload),
        },
      };
    },
  },

  // biome-ignore lint/suspicious/noExplicitAny: Markdown token/helper types are dynamic
  parseMarkdown: (token: any, helpers: any) => {
    const source = String(token.attributes?.source || '').trim();
    const kind = getEmbedKind(source);
    const payload = getEmbedSourcePayload(source);

    return helpers.createNode(
      'zennEmbedBlock',
      {
        className: token.attributes?.className || buildEmbedClassName(kind),
        source,
        iframeSrc: '',
        iframeId: token.attributes?.iframeId || buildEmbedIframeId(kind),
        iframeDataContent:
          token.attributes?.iframeDataContent || encodeURIComponent(payload),
        iframeWidth: '100%',
        iframeStyle: '',
        iframeScrolling: 'no',
        iframeFrameborder: '0',
        iframeLoading: 'lazy',
        iframeAllow: '',
        iframeAllowfullscreen: '',
      },
      [],
    );
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

    const payload = decodeEmbedPayload(
      String(node.attrs.iframeDataContent || ''),
    ).trim();
    if (payload) {
      return `${payload}\n`;
    }

    const src = String(node.attrs.iframeSrc || '').trim();
    return src ? `${src}\n` : '';
  },
});
