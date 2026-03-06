import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';

export const ZENN_FOOTNOTE_CONVERSION_META_KEY = 'zennFootnoteConverted';

type FootnoteItem = {
  label: string;
  index: number;
  content: string;
  footnoteId: string;
  refId: string;
};

type RefToken = {
  label: string;
};

type TextToken = {
  text: string;
};

type Token = RefToken | TextToken;

type ParagraphReplacement = {
  from: number;
  to: number;
  node: ProseMirrorNode;
};

type DefinitionLine = {
  label: string;
  content: string;
  from: number;
  to: number;
};

type ExistingSection = {
  from: number;
  to: number;
  items: FootnoteItem[];
};

const FOOTNOTE_DEF_PATTERN = /^\[\^([^\]]+)\]:\s*(.*)$/;
const FOOTNOTE_REF_PATTERN = /\[\^([^\]\s]+)\]|\^\[([^\]]+)\]/g;

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

const extractDefinitionFromParagraph = (node: ProseMirrorNode) => {
  if (!node.isTextblock) return null;
  if (node.childCount !== 1 || !node.firstChild?.isText) return null;
  const text = node.textContent || '';
  const match = text.match(FOOTNOTE_DEF_PATTERN);
  if (!match) return null;

  return {
    label: normalizeLabel(match[1] || '1'),
    content: (match[2] || '').trim(),
  };
};

const parseTokensFromText = (
  text: string,
  inlineSequenceRef: { value: number },
  inlineDefinitions: Map<string, string>,
) => {
  FOOTNOTE_REF_PATTERN.lastIndex = 0;
  const tokens: Token[] = [];
  let cursor = 0;
  let matched = false;

  for (;;) {
    const match = FOOTNOTE_REF_PATTERN.exec(text);
    if (!match || typeof match.index !== 'number') break;
    matched = true;

    if (match.index > cursor) {
      tokens.push({ text: text.slice(cursor, match.index) });
    }

    if (match[1]) {
      tokens.push({ label: normalizeLabel(match[1]) });
    } else {
      inlineSequenceRef.value += 1;
      const label = `inline-${inlineSequenceRef.value}`;
      const content = (match[2] || '').trim();
      inlineDefinitions.set(label, content);
      tokens.push({ label });
    }

    cursor = match.index + match[0].length;
  }

  if (!matched) return null;
  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor) });
  }

  return tokens;
};

const collectState = (doc: ProseMirrorNode, schema: Schema) => {
  const paragraphType = schema.nodes.paragraph;
  const refType = schema.nodes.zennFootnoteReference;
  const sectionType = schema.nodes.zennFootnotesSection;

  if (!paragraphType || !refType || !sectionType) {
    return null;
  }

  const definitions = new Map<string, string>();
  const inlineDefinitions = new Map<string, string>();
  const labelsInOrder: string[] = [];
  const seenLabels = new Set<string>();
  const replacements: ParagraphReplacement[] = [];
  const definitionLines: DefinitionLine[] = [];
  const existingSections: ExistingSection[] = [];
  const inlineSequenceRef = { value: 0 };

  doc.descendants((node, pos) => {
    if (node.type === sectionType) {
      existingSections.push({
        from: pos,
        to: pos + node.nodeSize,
        items: parseItems(node.attrs.items),
      });
      return false;
    }

    if (node.type !== paragraphType) {
      return true;
    }

    const def = extractDefinitionFromParagraph(node);
    if (def) {
      definitions.set(def.label, def.content);
      definitionLines.push({
        ...def,
        from: pos,
        to: pos + node.nodeSize,
      });
      return false;
    }

    let hasSyntax = false;
    const nextChildren: ProseMirrorNode[] = [];

    node.forEach((child) => {
      if (child.type === refType) {
        const label = normalizeLabel(String(child.attrs.label || child.attrs.index || '1'));
        if (!seenLabels.has(label)) {
          labelsInOrder.push(label);
          seenLabels.add(label);
        }
        nextChildren.push(child);
        return;
      }

      if (!child.isText) {
        nextChildren.push(child);
        return;
      }

      const tokens = parseTokensFromText(
        child.text || '',
        inlineSequenceRef,
        inlineDefinitions,
      );
      if (!tokens) {
        nextChildren.push(child);
        return;
      }

      hasSyntax = true;
      tokens.forEach((token) => {
        if ('text' in token) {
          if (!token.text) return;
          nextChildren.push(schema.text(token.text, child.marks));
          return;
        }

        const label = normalizeLabel(token.label);
        if (!seenLabels.has(label)) {
          labelsInOrder.push(label);
          seenLabels.add(label);
        }
        nextChildren.push(
          refType.create({
            label,
            index: 0,
            footnoteId: '',
            refId: '',
          }),
        );
      });
    });

    if (hasSyntax) {
      replacements.push({
        from: pos,
        to: pos + node.nodeSize,
        node: paragraphType.create(node.attrs, nextChildren),
      });
    }

    return false;
  });

  existingSections.forEach((section) => {
    section.items.forEach((item) => {
      const label = normalizeLabel(item.label || String(item.index || 1));
      if (!definitions.has(label) && item.content) {
        definitions.set(label, item.content);
      }
    });
  });

  inlineDefinitions.forEach((content, label) => {
    if (!definitions.has(label)) {
      definitions.set(label, content);
    }
  });

  if (labelsInOrder.length === 0 && definitionLines.length === 0 && existingSections.length === 0) {
    return null;
  }

  const orderedItems: FootnoteItem[] = labelsInOrder.map((label, i) => {
    const index = i + 1;
    return {
      label,
      index,
      content: definitions.get(label) || '',
      footnoteId: `fn-${label}`,
      refId: `fnref-${label}`,
    };
  });

  return {
    replacements,
    definitionLines,
    existingSections,
    orderedItems,
  };
};

const normalizeItems = (items: FootnoteItem[]) => {
  return items.map((item) => ({
    label: normalizeLabel(item.label || String(item.index || 1)),
    index: Number(item.index || 0) || 0,
    content: String(item.content || ''),
    footnoteId: String(item.footnoteId || ''),
    refId: String(item.refId || ''),
  }));
};

const areSameItems = (left: FootnoteItem[], right: FootnoteItem[]) => {
  return JSON.stringify(normalizeItems(left)) === JSON.stringify(normalizeItems(right));
};

export const convertTypedZennFootnotes = (editor: Editor) => {
  return editor.commands.command(({ state, tr, dispatch }) => {
    const collected = collectState(tr.doc, state.schema);
    if (!collected) {
      return false;
    }

    const refType = state.schema.nodes.zennFootnoteReference;
    const sectionType = state.schema.nodes.zennFootnotesSection;
    if (!refType || !sectionType) {
      return false;
    }

    let changed = false;
    const hasNormalizationInputs =
      collected.replacements.length > 0 || collected.definitionLines.length > 0;
    const existing = collected.existingSections[0];
    const shouldRewriteSections =
      hasNormalizationInputs ||
      collected.existingSections.length !== 1 ||
      collected.orderedItems.length === 0 ||
      !existing ||
      !areSameItems(existing.items, collected.orderedItems);

    const indexByLabel = new Map<string, FootnoteItem>();
    collected.orderedItems.forEach((item) => {
      indexByLabel.set(item.label, item);
    });

    collected.replacements
      .sort((a, b) => b.from - a.from)
      .forEach((replacement) => {
        const nextChildren: ProseMirrorNode[] = [];
        replacement.node.forEach((child) => {
          if (child.type !== refType) {
            nextChildren.push(child);
            return;
          }

          const label = normalizeLabel(String(child.attrs.label || '1'));
          const item = indexByLabel.get(label);
          const index = item?.index || 1;
          nextChildren.push(
            refType.create({
              label,
              index,
              footnoteId: item?.footnoteId || `fn-${label}`,
              refId: item?.refId || `fnref-${label}`,
            }),
          );
        });

        const updatedParagraph = state.schema.nodes.paragraph.create(
          replacement.node.attrs,
          nextChildren,
        );
        const from = tr.mapping.map(replacement.from);
        const to = tr.mapping.map(replacement.to);
        tr.replaceWith(from, to, updatedParagraph);
        changed = true;
      });

    if (shouldRewriteSections) {
      [...collected.definitionLines, ...collected.existingSections]
        .sort((a, b) => b.from - a.from)
        .forEach((line) => {
          const from = tr.mapping.map(line.from);
          const to = tr.mapping.map(line.to);
          tr.delete(from, to);
          changed = true;
        });

      if (collected.orderedItems.length > 0) {
        const section = sectionType.create({
          items: JSON.stringify(collected.orderedItems),
        });
        tr.insert(tr.doc.content.size, section);
        changed = true;
      }
    }

    if (!changed) {
      return false;
    }

    tr.setMeta(ZENN_FOOTNOTE_CONVERSION_META_KEY, true);
    dispatch?.(tr);
    return true;
  });
};
