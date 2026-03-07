import { useState, useEffect, useMemo, useRef } from 'react';
import markdownToHtml from 'zenn-markdown-html';
import { INITIAL_MARKDOWN } from '../constants/editor';
import { serializeFrontmatter } from '../frontmatter/frontmatter';
import {
  mergeMarkdownParts,
  splitMarkdownParts,
  stripLeadingFrontmatter,
} from '../utils/markdown';
import { bootZennEmbedRuntime } from '../utils/zenn-embed-runtime';
import { validateWithZennModel } from '../utils/zenn-model';

export const shouldUseExternalEmbedOrigin = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return !navigator.userAgent.includes('HappyDOM');
};

const EMBED_ONLY_LINE_PATTERN = /^(@\[[\w-]+\]\(.+\)|https?:\/\/\S+)$/gim;

export const getInitialMarkdownByEnvironment = () => {
  if (shouldUseExternalEmbedOrigin()) {
    return INITIAL_MARKDOWN;
  }
  return INITIAL_MARKDOWN.replace(
    EMBED_ONLY_LINE_PATTERN,
    (line) => `\`${line}\``,
  );
};

export const createDefaultFrontmatter = (documentName: string) => {
  const baseTitle = documentName.replace(/\.md$/i, '').trim() || 'untitled';
  return serializeFrontmatter({
    title: baseTitle,
    emoji: '📝',
    type: 'tech',
    topics: [],
    published: false,
  });
};

export const useEditorState = () => {
  const initialMarkdown = useMemo(() => getInitialMarkdownByEnvironment(), []);
  const initialParts = useMemo(
    () => splitMarkdownParts(initialMarkdown),
    [initialMarkdown],
  );
  const shouldDeferInitialRender = shouldUseExternalEmbedOrigin();
  
  const [frontmatter, setFrontmatter] = useState(initialParts.frontmatter);
  const [body, setBody] = useState(initialParts.body);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isInitialHtmlReady, setIsInitialHtmlReady] = useState(
    !shouldDeferInitialRender,
  );
  const [documentName, setDocumentName] = useState('untitled.md');
  const [saveStatus, setSaveStatus] = useState('Live markdown editing');

  const hasInitialHtmlResolvedRef = useRef(!shouldDeferInitialRender);

  const markdown = useMemo(() => {
    return mergeMarkdownParts({ frontmatter, body });
  }, [frontmatter, body]);

  const modelValidation = useMemo(
    () =>
      validateWithZennModel({
        frontmatter,
        bodyHtml: renderedHtml,
        documentName,
      }),
    [frontmatter, renderedHtml, documentName],
  );

  const loadMarkdownDocument = (nextMarkdown: string, nextName: string) => {
    const parts = splitMarkdownParts(nextMarkdown);
    const nextFrontmatter = parts.frontmatter.trim()
      ? parts.frontmatter
      : createDefaultFrontmatter(nextName);
    setFrontmatter(nextFrontmatter);
    setBody(parts.body);
    setDocumentName(nextName);
    setSaveStatus(`Loaded ${nextName}`);
  };

  const handleFrontmatterChange = (val: string) => {
    setFrontmatter(val);
    setSaveStatus('Live markdown editing');
  };

  const handleBodyChange = (val: string) => {
    setBody(stripLeadingFrontmatter(val));
    setSaveStatus('Live markdown editing');
  };

  useEffect(() => {
    let cancelled = false;
    const options = shouldUseExternalEmbedOrigin()
      ? { embedOrigin: 'https://embed.zenn.studio' as const }
      : undefined;

    void markdownToHtml(body, options)
      .then((html) => {
        if (!cancelled) {
          setRenderedHtml(html);
          if (!hasInitialHtmlResolvedRef.current) {
            hasInitialHtmlResolvedRef.current = true;
            setIsInitialHtmlReady(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderedHtml('');
          if (!hasInitialHtmlResolvedRef.current) {
            hasInitialHtmlResolvedRef.current = true;
            setIsInitialHtmlReady(true);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [body]);

  useEffect(() => {
    if (shouldUseExternalEmbedOrigin()) {
      bootZennEmbedRuntime();
    }
  }, []);

  return {
    frontmatter,
    body,
    renderedHtml,
    isInitialHtmlReady,
    documentName,
    saveStatus,
    markdown,
    modelValidation,
    initialMarkdown,
    setSaveStatus,
    setDocumentName,
    loadMarkdownDocument,
    handleFrontmatterChange,
    handleBodyChange,
  };
};
