import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, NodeType, Schema } from '@tiptap/pm/model';

const CONTAINER_OPEN_PATTERN = /^:::(message|details)(?:\s+(.*))?$/;
const CONTAINER_CLOSE_PATTERN = /^:::\s*$/;
export const ZENN_CONTAINER_CONVERSION_META_KEY = 'zennContainerConverted';

type ContainerKind = 'message' | 'details';

type ContainerOpenMatch = {
  kind: ContainerKind;
  parameter: string;
};

type Replacement = {
  from: number;
  to: number;
  node: ProseMirrorNode;
};

const parseContainerOpen = (value: string): ContainerOpenMatch | null => {
  const match = value.trim().match(CONTAINER_OPEN_PATTERN);
  if (!match) return null;
  return {
    kind: match[1] as ContainerKind,
    parameter: (match[2] || '').trim(),
  };
};

const isContainerClose = (value: string) => {
  return CONTAINER_CLOSE_PATTERN.test(value.trim());
};

const isParagraphNode = (node: ProseMirrorNode, paragraphType: NodeType) => {
  return node.type === paragraphType;
};

const createContainerNode = (
  schema: Schema,
  open: ContainerOpenMatch,
  content: ProseMirrorNode[],
) => {
  const paragraphType = schema.nodes.paragraph;
  const fallbackContent = content.length > 0 ? content : [paragraphType.create()];

  if (open.kind === 'message') {
    const messageType = schema.nodes.zennMessage;
    const variant = open.parameter === 'alert' ? 'alert' : 'info';
    return messageType.create({ variant }, fallbackContent);
  }

  const detailsType = schema.nodes.zennDetails;
  const summary = open.parameter || 'Details';
  return detailsType.create({ summary, open: false }, fallbackContent);
};

const findFirstContainerReplacement = (
  doc: ProseMirrorNode,
  schema: Schema,
): Replacement | null => {
  const paragraphType = schema.nodes.paragraph;
  const messageType = schema.nodes.zennMessage;
  const detailsType = schema.nodes.zennDetails;

  if (!paragraphType || !messageType || !detailsType) {
    return null;
  }

  const starts: number[] = [];
  let position = 1;
  for (let i = 0; i < doc.childCount; i += 1) {
    starts.push(position);
    position += doc.child(i).nodeSize;
  }

  for (let i = 0; i < doc.childCount; i += 1) {
    const startNode = doc.child(i);
    if (!isParagraphNode(startNode, paragraphType)) continue;

    const opening = parseContainerOpen(startNode.textContent || '');
    if (!opening) continue;

    for (let j = i + 1; j < doc.childCount; j += 1) {
      const endNode = doc.child(j);
      if (!isParagraphNode(endNode, paragraphType)) continue;
      if (!isContainerClose(endNode.textContent || '')) continue;

      const content: ProseMirrorNode[] = [];
      for (let k = i + 1; k < j; k += 1) {
        content.push(doc.child(k));
      }

      return {
        from: starts[i],
        to: starts[j] + endNode.nodeSize,
        node: createContainerNode(schema, opening, content),
      };
    }
  }

  return null;
};

export const convertTypedZennContainers = (editor: Editor) => {
  return editor.commands.command(({ state, tr, dispatch }) => {
    let changed = false;
    let guard = 0;

    while (guard < 50) {
      const replacement = findFirstContainerReplacement(tr.doc, state.schema);
      if (!replacement) break;
      tr.replaceWith(replacement.from, replacement.to, replacement.node);
      changed = true;
      guard += 1;
    }

    if (!changed) {
      return false;
    }

    tr.setMeta(ZENN_CONTAINER_CONVERSION_META_KEY, true);
    dispatch?.(tr);
    return true;
  });
};
