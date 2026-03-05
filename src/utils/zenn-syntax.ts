import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

type ContainerType = 'message' | 'details';

export type ZennSyntaxCounts = {
  message: number;
  details: number;
  embed: number;
};

const EMBED_ONLY_LINE_PATTERN = /^(@\[[\w-]+\]\(.+\)|https?:\/\/\S+)$/;
const CONTAINER_OPEN_PATTERN = /^:::(message|details)(?:\s+.*)?$/;
const FENCE_OPEN_CLOSE_PATTERN = /^(```+|~~~+)/;

const createCounts = (): ZennSyntaxCounts => ({
  message: 0,
  details: 0,
  embed: 0,
});

export const countExpectedZennSyntax = (markdown: string): ZennSyntaxCounts => {
  const counts = createCounts();
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const containerStack: ContainerType[] = [];
  let activeFence: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(FENCE_OPEN_CLOSE_PATTERN);

    if (fenceMatch) {
      const fence = fenceMatch[1];
      if (!activeFence) {
        activeFence = fence;
      } else if (
        activeFence[0] === fence[0] &&
        fence.length >= activeFence.length
      ) {
        activeFence = null;
      }
      continue;
    }

    if (activeFence) continue;

    if (EMBED_ONLY_LINE_PATTERN.test(trimmed)) {
      counts.embed += 1;
    }

    const openMatch = trimmed.match(CONTAINER_OPEN_PATTERN);
    if (openMatch) {
      containerStack.push(openMatch[1] as ContainerType);
      continue;
    }

    if (trimmed === ':::' && containerStack.length > 0) {
      const container = containerStack.pop();
      if (container) {
        counts[container] += 1;
      }
    }
  }

  return counts;
};

export const countActualZennSyntax = (doc: ProseMirrorNode): ZennSyntaxCounts => {
  const counts = createCounts();

  doc.descendants((node) => {
    if (node.type.name === 'zennMessage') {
      counts.message += 1;
      return;
    }

    if (node.type.name === 'zennDetails') {
      counts.details += 1;
      return;
    }

    if (node.type.name === 'zennEmbedBlock') {
      counts.embed += 1;
    }
  });

  return counts;
};

export const hasUnresolvedZennSyntax = (
  markdown: string,
  doc: ProseMirrorNode,
) => {
  const expected = countExpectedZennSyntax(markdown);
  const actual = countActualZennSyntax(doc);

  return (
    expected.message > actual.message ||
    expected.details > actual.details ||
    expected.embed > actual.embed
  );
};
