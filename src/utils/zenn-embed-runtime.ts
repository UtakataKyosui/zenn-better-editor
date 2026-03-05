const isHappyDomRuntime = () => {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('HappyDOM');
};

const getThemeMode = () => {
  if (typeof document === 'undefined') return 'light';
  const theme = document.documentElement.getAttribute('data-theme') || '';
  return theme.includes('dark') ? 'dark' : 'light';
};

const toObject = (value: unknown): Record<string, unknown> => {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
};

const parseEmbedMessage = (raw: unknown) => {
  const parsed =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return {};
          }
        })()
      : raw;

  const envelope = toObject(parsed);
  const type = typeof envelope.type === 'string' ? envelope.type : 'none';
  const data = toObject(envelope.data);
  return { type, data };
};

const postRenderingMessage = (iframe: HTMLIFrameElement) => {
  const encodedSrc = iframe.getAttribute('data-content');
  if (!encodedSrc) return;

  const payload = {
    type: 'rendering',
    data: {
      src: encodedSrc,
      theme: getThemeMode(),
    },
  };

  iframe.contentWindow?.postMessage(JSON.stringify(payload), '*');
};

const postThemeMessageToAllIframes = () => {
  if (typeof document === 'undefined') return;

  const payload = {
    type: 'changeTheme',
    data: {
      theme: getThemeMode(),
    },
  };

  const message = JSON.stringify(payload);
  for (const iframe of document.querySelectorAll('iframe')) {
    iframe.contentWindow?.postMessage(message, '*');
  }
};

const EMBED_PRIMED_ATTRIBUTE = 'data-zenn-embed-primed';

export const primeZennEmbeddedIframe = (iframe: HTMLIFrameElement) => {
  if (typeof window === 'undefined' || isHappyDomRuntime()) return;

  if (!iframe.hasAttribute(EMBED_PRIMED_ATTRIBUTE)) {
    iframe.setAttribute(EMBED_PRIMED_ATTRIBUTE, '1');
    iframe.addEventListener('load', () => {
      postRenderingMessage(iframe);
    });
  }

  // Try immediately and once after next tick to avoid missing early handshakes.
  postRenderingMessage(iframe);
  window.setTimeout(() => {
    postRenderingMessage(iframe);
  }, 50);
};

export const primeZennEmbeddedIframes = (
  root: ParentNode | Document = document,
) => {
  if (typeof window === 'undefined' || isHappyDomRuntime()) return;

  const targets = root.querySelectorAll(
    'span.embed-block.zenn-embedded iframe[data-content]',
  );
  for (const node of targets) {
    if (node instanceof HTMLIFrameElement) {
      primeZennEmbeddedIframe(node);
    }
  }
};

let bridgeInitialized = false;
let katexElementsLoaded = false;

export const initializeZennEmbedBridge = () => {
  if (
    bridgeInitialized ||
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    isHappyDomRuntime()
  ) {
    return;
  }

  bridgeInitialized = true;

  const observer = new MutationObserver((mutations) => {
    const themeChanged = mutations.some(
      (mutation) =>
        mutation.type === 'attributes' && mutation.attributeName === 'data-theme',
    );
    if (themeChanged) {
      postThemeMessageToAllIframes();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  window.addEventListener('message', (event) => {
    const parsed = parseEmbedMessage(event.data);

    if (parsed.type === 'ready') {
      const id = typeof parsed.data.id === 'string' ? parsed.data.id : '';
      if (!id) return;

      const iframe = document.getElementById(id);
      if (!(iframe instanceof HTMLIFrameElement)) return;

      postRenderingMessage(iframe);
      return;
    }

    if (parsed.type === 'resize') {
      const id = typeof parsed.data.id === 'string' ? parsed.data.id : '';
      const nextHeight =
        typeof parsed.data.height === 'number' ? parsed.data.height : 0;
      if (!id || nextHeight <= 0) return;

      const iframe = document.getElementById(id);
      if (!(iframe instanceof HTMLIFrameElement)) return;

      iframe.height = `${nextHeight}`;
    }
  });
};

export const bootZennEmbedRuntime = () => {
  if (typeof window === 'undefined' || isHappyDomRuntime()) {
    return;
  }

  initializeZennEmbedBridge();

  if (!katexElementsLoaded) {
    katexElementsLoaded = true;
    void import('zenn-embed-elements');
  }
};
