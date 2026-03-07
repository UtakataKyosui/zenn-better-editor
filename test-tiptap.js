import { Editor } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

const editor = new Editor({
  extensions: [StarterKit, Markdown],
  content: '# Hello',
});

console.log(Object.keys(editor.storage));
console.log(typeof editor.storage.markdown?.getMarkdown);
