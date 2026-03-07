import { Extension, findChildren } from '@tiptap/core';
import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import mermaid from 'mermaid';

type MermaidPreviewOptions = {
  nodeName: string;
  languages: string[];
  onEdit?: (payload: MermaidEditPayload) => void;
};

export type MermaidEditPayload = {
  pos: number;
  source: string;
  language: string;
};

let mermaidInitialized = false;
let mermaidIdSeed = 0;

const MERMAID_HEAD_PATTERN =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|xychart(?:-beta)?|sankey-beta|block-beta)\b/;

const normalizeLanguage = (value: string) => {
  const compact = value.trim().toLowerCase();
  if (!compact) return '';
  const firstToken = compact.split(/\s+/)[0] || '';
  const language = firstToken.split(':')[0] || '';
  return language;
};

const isLikelyMermaidSource = (source: string) => {
  const lines = source
    .split(/\r\n?|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const firstLine = lines.find((line) => !line.startsWith('%%')) || lines[0];

  if (!firstLine) return false;
  return MERMAID_HEAD_PATTERN.test(firstLine);
};

const ensureMermaidInitialized = () => {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
  });
  mermaidInitialized = true;
};

const createMermaidWidget = ({
  source,
  language,
  pos,
  onEdit,
}: {
  source: string;
  language: string;
  pos: number;
  onEdit?: (payload: MermaidEditPayload) => void;
}) => {
  const root = document.createElement('div');
  root.className = 'tiptap-mermaid-preview';

  const header = document.createElement('div');
  header.className = 'tiptap-mermaid-preview__header';

  const label = document.createElement('p');
  label.className = 'tiptap-mermaid-preview__label';
  label.textContent = 'Mermaid preview';

  const editButton = document.createElement('button');
  editButton.className = 'tiptap-mermaid-preview__edit';
  editButton.type = 'button';
  editButton.textContent = 'Edit Mermaid';
  editButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onEdit?.({ pos, source, language });
  });

  header.append(label, editButton);

  const canvas = document.createElement('div');
  canvas.className = 'tiptap-mermaid-preview__canvas';
  canvas.textContent = 'Rendering diagram...';

  root.append(header, canvas);

  ensureMermaidInitialized();
  const id = `tiptap-mermaid-${mermaidIdSeed++}`;

  void mermaid
    .render(id, source)
    .then((result) => {
      canvas.innerHTML = result.svg;
      result.bindFunctions?.(canvas);
    })
    .catch(() => {
      canvas.textContent = 'Mermaid syntax error';
      canvas.classList.add('tiptap-mermaid-preview__canvas--error');
    });

  return root;
};

const buildDecorations = ({
  doc,
  nodeName,
  languages,
  onEdit,
}: {
  doc: ProsemirrorNode;
  nodeName: string;
  languages: Set<string>;
  onEdit?: (payload: MermaidEditPayload) => void;
}) => {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === nodeName).forEach((block) => {
    const rawSource = block.node.textContent;
    const source = rawSource.trim();
    if (!source) return;
    const rawLanguage = String(block.node.attrs.language || '');
    const language = normalizeLanguage(rawLanguage);
    const isMermaidLanguage = languages.has(language);
    const shouldTreatAsMermaid =
      isMermaidLanguage ||
      (!language && isLikelyMermaidSource(rawSource)) ||
      ((language === 'text' || language === 'plaintext') &&
        isLikelyMermaidSource(rawSource));

    if (!shouldTreatAsMermaid) return;

    const effectiveLanguage = isMermaidLanguage ? language : 'mermaid';

    decorations.push(
      Decoration.widget(
        block.pos + block.node.nodeSize,
        () =>
          createMermaidWidget({
            source: rawSource,
            language: effectiveLanguage,
            pos: block.pos,
            onEdit,
          }),
        {
          side: 1,
          key: `mermaid-${block.pos}-${source}`,
        },
      ),
    );
  });

  return DecorationSet.create(doc, decorations);
};

export const MermaidPreview = Extension.create<MermaidPreviewOptions>({
  name: 'mermaidPreview',

  addOptions() {
    return {
      nodeName: 'codeBlock',
      languages: ['mermaid', 'mmd'],
      onEdit: undefined,
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey<DecorationSet>('mermaid-preview');
    const languages = new Set(
      this.options.languages.map((lang) => lang.toLowerCase()),
    );

    return [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, state) =>
            buildDecorations({
              doc: state.doc,
              nodeName: this.options.nodeName,
              languages,
              onEdit: this.options.onEdit,
            }),
          apply: (transaction, decorationSet, _oldState, newState) => {
            if (!transaction.docChanged) {
              return decorationSet.map(transaction.mapping, transaction.doc);
            }

            return buildDecorations({
              doc: newState.doc,
              nodeName: this.options.nodeName,
              languages,
              onEdit: this.options.onEdit,
            });
          },
        },
        props: {
          decorations: (state) => pluginKey.getState(state),
        },
      }),
    ];
  },
});
