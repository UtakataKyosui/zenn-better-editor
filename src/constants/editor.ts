export const AUTOSAVE_STORAGE_KEY = 'rich-zenn-editor:draft';

export const INITIAL_MARKDOWN = `---
title: "Rich Zenn Editor preview demo"
emoji: "📚"
type: "tech"
topics:
  - editor
  - zenn
  - preview
published: false
---

# ローカルプレビュー確認用のサンプル

起動直後に Zenn 記法の見え方を確認できるよう、主要なブロックを最初から配置しています。

:::message
このブロックは Zenn の message 記法です。注意書きや補足に使います。
:::

## 箇条書き

- 見出しの表示
- リストの表示
- コードブロックの表示

:::details ローカルプレビューで開いて確認
details 記法の見え方をここで確認できます。あとで折りたたみ挙動も強化できます。
:::

@[card](https://zenn.dev/zenn/articles/markdown-guide)

> 引用ブロックも同時に確認できます。

\`\`\`ts
export const previewTarget = {
  mode: 'markdown-direct',
  renderer: 'zenn-markdown-html',
};
\`\`\`
`;

export const MARKDOWN_FILE_TYPES = [
  {
    description: 'Markdown files',
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.md'],
    },
  },
];
