import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';

export const ZENN_IMAGE_CONVERSION_META_KEY = 'zennImageConverted';

type ParsedImageTarget = {
  src: string;
  title: string | null;
  width: string | null;
  height: string | null;
};

export type ParsedZennImageInsertion = ParsedImageTarget & {
  alt: string;
  href: string | null;
};

type Replacement = {
  from: number;
  to: number;
  node: ProseMirrorNode;
};

const normalizeNumericValue = (value: string) => {
  const text = value.trim();
  if (!text) return null;
  return /^\d+$/.test(text) ? text : null;
};

const unescapeAltText = (value: string) => {
  return value.replace(/\\\]/g, ']').replace(/\\\\/g, '\\');
};

const parseImageTarget = (rawTarget: string): ParsedImageTarget | null => {
  let rest = rawTarget.trim();
  if (!rest) return null;

  let title: string | null = null;
  const titleMatch = rest.match(/\s+"((?:\\"|[^"])*)"\s*$/);
  if (titleMatch && typeof titleMatch.index === 'number') {
    title = titleMatch[1].replace(/\\"/g, '"').trim();
    rest = rest.slice(0, titleMatch.index).trimEnd();
  }

  let width: string | null = null;
  let height: string | null = null;
  const sizeMatch = rest.match(/\s+=([0-9]*)x([0-9]*)\s*$/);
  if (sizeMatch && typeof sizeMatch.index === 'number') {
    width = normalizeNumericValue(sizeMatch[1] || '');
    height = normalizeNumericValue(sizeMatch[2] || '');
    rest = rest.slice(0, sizeMatch.index).trimEnd();
  }

  const src = rest.trim();
  if (!src) return null;

  return {
    src,
    title,
    width,
    height,
  };
};

const parsePlainImageLine = (
  line: string,
): Omit<ParsedZennImageInsertion, 'href'> | null => {
  const match = line.match(/^!\[((?:\\.|[^\]])*)\]\((.+)\)$/);
  if (!match) return null;

  const target = parseImageTarget(match[2] || '');
  if (!target) return null;

  return {
    alt: unescapeAltText(match[1] || ''),
    ...target,
  };
};

export const parseZennImageInsertionLine = (
  line: string,
): ParsedZennImageInsertion | null => {
  const normalized = line.replace(/\u00a0/g, ' ').trim();
  if (!normalized) return null;

  const plain = parsePlainImageLine(normalized);
  if (plain) {
    return {
      ...plain,
      href: null,
    };
  }

  if (!normalized.startsWith('[') || !normalized.endsWith(')')) {
    return null;
  }

  const splitIndex = normalized.lastIndexOf('](');
  if (splitIndex <= 1) {
    return null;
  }

  const inner = normalized.slice(1, splitIndex).trim();
  const href = normalized.slice(splitIndex + 2, -1).trim();
  if (!href) {
    return null;
  }

  const linked = parsePlainImageLine(inner);
  if (!linked) {
    return null;
  }

  return {
    ...linked,
    href,
  };
};

const findFirstImageReplacement = (
  doc: ProseMirrorNode,
  schema: Schema,
): Replacement | null => {
  const paragraphType = schema.nodes.paragraph;
  const imageType = schema.nodes.image;

  if (!paragraphType || !imageType) {
    return null;
  }

  let replacement: Replacement | null = null;
  doc.descendants((node, pos) => {
    if (replacement) return false;
    if (node.type !== paragraphType) return true;

    const parsed = parseZennImageInsertionLine(node.textContent || '');
    if (!parsed) return true;

    const imageAttrs: Record<string, string> = {
      src: parsed.src,
      alt: parsed.alt,
      class: 'md-img',
      loading: 'eager',
    };
    if (parsed.title) {
      imageAttrs.title = parsed.title;
    }
    if (parsed.width) {
      imageAttrs.width = parsed.width;
    }
    if (parsed.height) {
      imageAttrs.height = parsed.height;
    }

    let imageNode = imageType.create(imageAttrs);
    if (parsed.href && schema.marks.link) {
      imageNode = imageNode.mark([
        schema.marks.link.create({
          href: parsed.href,
        }),
      ]);
    }

    replacement = {
      from: pos,
      to: pos + node.nodeSize,
      node: paragraphType.create(undefined, [imageNode]),
    };

    return false;
  });

  return replacement;
};

export const convertTypedZennImages = (editor: Editor) => {
  return editor.commands.command(({ state, tr, dispatch }) => {
    let changed = false;
    let guard = 0;

    while (guard < 50) {
      const replacement = findFirstImageReplacement(tr.doc, state.schema);
      if (!replacement) break;
      tr.replaceWith(replacement.from, replacement.to, replacement.node);
      changed = true;
      guard += 1;
    }

    if (!changed) {
      return false;
    }

    tr.setMeta(ZENN_IMAGE_CONVERSION_META_KEY, true);
    dispatch?.(tr);
    return true;
  });
};
