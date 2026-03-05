/**
 * Custom markdown-it plugin for Zenn container directives.
 *
 * This adds parsing support for:
 *   :::message / :::message alert
 *   :::details summary text
 *
 * These get converted to HTML that our Tiptap ZennMessage/ZennDetails
 * nodes can pick up via parseHTML.
 */

// biome-ignore lint/suspicious/noExplicitAny: markdown-it types are complex
type MarkdownIt = any;

const CONTAINER_RE = /^:::(\w+)\s*(.*)?$/;

export const zennContainerPlugin = (md: MarkdownIt) => {
  md.block.ruler.before(
    'fence',
    'zenn_container',
    // biome-ignore lint/suspicious/noExplicitAny: markdown-it state types
    (state: any, startLine: number, endLine: number, silent: boolean) => {
      const startPos = state.bMarks[startLine] + state.tShift[startLine];
      const maxPos = state.eMarks[startLine];
      const lineText = state.src.slice(startPos, maxPos);

      const match = lineText.match(CONTAINER_RE);
      if (!match) return false;

      const containerType = match[1]; // 'message' or 'details'
      const param = (match[2] || '').trim();

      if (!['message', 'details'].includes(containerType)) return false;

      if (silent) return true;

      // Find the closing :::
      let nextLine = startLine + 1;
      let hasClose = false;

      while (nextLine < endLine) {
        const nPos = state.bMarks[nextLine] + state.tShift[nextLine];
        const nMax = state.eMarks[nextLine];
        const nLine = state.src.slice(nPos, nMax).trim();

        if (nLine === ':::') {
          hasClose = true;
          break;
        }
        nextLine++;
      }

      if (!hasClose) return false;

      // Create token
      const tokenOpen = state.push(`zenn_${containerType}_open`, 'div', 1);
      tokenOpen.block = true;
      tokenOpen.info = param;
      tokenOpen.map = [startLine, nextLine];

      if (containerType === 'message') {
        tokenOpen.tag = 'aside';
        tokenOpen.attrSet('class', param === 'alert' ? 'msg alert' : 'msg message');
        tokenOpen.attrSet('data-variant', param === 'alert' ? 'alert' : 'info');
      } else if (containerType === 'details') {
        // We'll emit <details> with a <summary>
        tokenOpen.tag = 'details';
        tokenOpen.attrSet('class', 'zenn-details');
        tokenOpen.attrSet('data-summary', param || 'Details');
      }

      // Parse inner content
      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      state.parentType = 'container';
      state.lineMax = nextLine;

      // For details, add summary element
      if (containerType === 'details') {
        const summaryOpen = state.push('html_block', '', 0);
        summaryOpen.content = `<summary>${param || 'Details'}</summary><div class="details-content">`;
        summaryOpen.block = true;
      }

      state.md.block.tokenize(state, startLine + 1, nextLine);

      if (containerType === 'details') {
        const summaryClose = state.push('html_block', '', 0);
        summaryClose.content = '</div>';
        summaryClose.block = true;
      }

      state.parentType = oldParent;
      state.lineMax = oldLineMax;

      const tokenClose = state.push(
        `zenn_${containerType}_close`,
        containerType === 'details' ? 'details' : 'aside',
        -1,
      );
      tokenClose.block = true;

      state.line = nextLine + 1;

      return true;
    },
  );
};

/**
 * Markdown serialization helpers for Zenn nodes.
 * Used by @tiptap/markdown's serializer config.
 */
export const zennMarkdownSerializers = {
  zennMessage: {
    // biome-ignore lint/suspicious/noExplicitAny: Tiptap serializer types
    serialize(state: any, node: any) {
      const variant = node.attrs?.variant || 'info';
      const variantSuffix = variant === 'alert' ? ' alert' : '';
      state.write(`:::message${variantSuffix}\n`);
      state.renderContent(node);
      state.write(':::\n\n');
    },
  },
  zennDetails: {
    // biome-ignore lint/suspicious/noExplicitAny: Tiptap serializer types
    serialize(state: any, node: any) {
      const summary = node.attrs?.summary || 'Details';
      state.write(`:::details ${summary}\n`);
      state.renderContent(node);
      state.write(':::\n\n');
    },
  },
};
