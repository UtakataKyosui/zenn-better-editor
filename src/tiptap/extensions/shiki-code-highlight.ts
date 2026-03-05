import { Extension, findChildren } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  createJavaScriptRegexEngine,
  getSingletonHighlighter,
  type HighlighterGeneric,
} from 'shiki';

type ShikiToken = {
  content: string;
  offset: number;
  color?: string;
  bgColor?: string;
  fontStyle?: number;
  htmlStyle?: Record<string, string>;
};

type ShikiCodeHighlightOptions = {
  nodeName: string;
  theme: string;
  defaultLanguage: string;
};

const SHIKI_REFRESH_META = 'zenn-shiki-refresh';
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;
const FONT_STYLE_UNDERLINE = 4;

let highlighterPromise: Promise<HighlighterGeneric<string, string>> | null =
  null;

const getHighlighter = (theme: string) => {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter({
      themes: [theme],
      langs: ['text'],
      engine: createJavaScriptRegexEngine(),
      // biome-ignore lint/suspicious/noExplicitAny: generic return type detail is not exported cleanly
    }) as Promise<HighlighterGeneric<string, string>>;
  }

  return highlighterPromise;
};

const ensureLanguage = async (
  highlighter: HighlighterGeneric<string, string>,
  language: string,
  fallbackLanguage: string,
) => {
  const normalized = (language || fallbackLanguage).trim().toLowerCase();
  const resolvedLanguage = highlighter.resolveLangAlias(normalized) || normalized;
  const loaded = new Set(highlighter.getLoadedLanguages());

  if (!loaded.has(resolvedLanguage) && resolvedLanguage !== 'text') {
    try {
      await highlighter.loadLanguage(resolvedLanguage);
    } catch {
      return fallbackLanguage;
    }
  }

  return resolvedLanguage;
};

const getTokenStyle = (token: ShikiToken) => {
  const chunks: string[] = [];

  if (token.htmlStyle) {
    for (const [key, value] of Object.entries(token.htmlStyle)) {
      chunks.push(`${key}:${value}`);
    }
  } else {
    if (token.color) {
      chunks.push(`color:${token.color}`);
    }

    if (token.bgColor) {
      chunks.push(`background-color:${token.bgColor}`);
    }

    const fontStyle = token.fontStyle || 0;
    if (fontStyle & FONT_STYLE_ITALIC) {
      chunks.push('font-style:italic');
    }
    if (fontStyle & FONT_STYLE_BOLD) {
      chunks.push('font-weight:700');
    }
    if (fontStyle & FONT_STYLE_UNDERLINE) {
      chunks.push('text-decoration:underline');
    }
  }

  return chunks.length > 0 ? chunks.join(';') : null;
};

const buildDecorations = ({
  doc,
  nodeName,
  theme,
  defaultLanguage,
  tokenCache,
  pendingRequests,
  dispatchRefresh,
}: {
  doc: ProsemirrorNode;
  nodeName: string;
  theme: string;
  defaultLanguage: string;
  tokenCache: Map<string, ShikiToken[][]>;
  pendingRequests: Set<string>;
  dispatchRefresh: () => void;
}) => {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === nodeName).forEach((block) => {
    const source = block.node.textContent;
    if (!source.trim()) return;

    const language = (block.node.attrs.language || defaultLanguage) as string;
    const cacheKey = `${language}\u0000${source}`;
    const cachedTokens = tokenCache.get(cacheKey);

    if (!cachedTokens) {
      if (pendingRequests.has(cacheKey)) {
        return;
      }

      pendingRequests.add(cacheKey);
      void getHighlighter(theme)
        .then(async (highlighter) => {
          const resolvedLanguage = await ensureLanguage(
            highlighter,
            language,
            defaultLanguage,
          );
          const tokens = highlighter.codeToTokensBase(source, {
            lang: resolvedLanguage,
            theme,
          });

          tokenCache.set(cacheKey, tokens as ShikiToken[][]);
        })
        .catch(() => {
          tokenCache.set(cacheKey, []);
        })
        .finally(() => {
          pendingRequests.delete(cacheKey);
          dispatchRefresh();
        });

      return;
    }

    for (const line of cachedTokens) {
      for (const token of line) {
        const style = getTokenStyle(token);
        if (!style || !token.content) continue;

        const from = block.pos + 1 + token.offset;
        const to = from + token.content.length;
        decorations.push(
          Decoration.inline(from, to, {
            style,
          }),
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
};

export const ZennShikiCodeHighlight = Extension.create<ShikiCodeHighlightOptions>(
  {
    name: 'zennShikiCodeHighlight',

    addOptions() {
      return {
        nodeName: 'codeBlock',
        theme: 'github-dark',
        defaultLanguage: 'text',
      };
    },

    addProseMirrorPlugins() {
      const tokenCache = new Map<string, ShikiToken[][]>();
      const pendingRequests = new Set<string>();
      const pluginKey = new PluginKey<DecorationSet>('zenn-shiki-code-highlight');

      return [
        new Plugin<DecorationSet>({
          key: pluginKey,

          state: {
            init: (_, state) =>
              buildDecorations({
                doc: state.doc,
                nodeName: this.options.nodeName,
                theme: this.options.theme,
                defaultLanguage: this.options.defaultLanguage,
                tokenCache,
                pendingRequests,
                dispatchRefresh: () => {
                  const { view } = this.editor;
                  if (!view || view.isDestroyed) return;
                  view.dispatch(view.state.tr.setMeta(SHIKI_REFRESH_META, true));
                },
              }),
            apply: (transaction, decorationSet, _oldState, newState) => {
              const shouldRebuild =
                transaction.docChanged || Boolean(transaction.getMeta(SHIKI_REFRESH_META));

              if (shouldRebuild) {
                return buildDecorations({
                  doc: newState.doc,
                  nodeName: this.options.nodeName,
                  theme: this.options.theme,
                  defaultLanguage: this.options.defaultLanguage,
                  tokenCache,
                  pendingRequests,
                  dispatchRefresh: () => {
                    const { view } = this.editor;
                    if (!view || view.isDestroyed) return;
                    view.dispatch(
                      view.state.tr.setMeta(SHIKI_REFRESH_META, true),
                    );
                  },
                });
              }

              return decorationSet.map(transaction.mapping, transaction.doc);
            },
          },

          props: {
            decorations: (state) => pluginKey.getState(state),
          },
        }),
      ];
    },
  },
);
