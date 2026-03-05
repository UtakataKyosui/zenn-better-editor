export const INITIAL_MARKDOWN = `---
title: "Zenn Markdown Guide 全パターンプレビュー"
emoji: "🧪"
type: "tech"
topics:
  - editor
  - zenn
  - preview
published: false
---

# ローカルプレビュー確認用のサンプル

このサンプルは、Zenn公式の「Markdown記法一覧」にある主要パターンを1ファイルで確認できるようにしたものです。

## 見出し

## 見出し2
### 見出し3
#### 見出し4

## リスト

- Hello!
- Hola!
  - Bonjour!
  - Hi!

### 番号付きリスト

1. First
2. Second

## テキストリンク

[Zenn Markdown Guide](https://zenn.dev/zenn/articles/markdown-guide)

## 画像

![](https://storage.googleapis.com/zenn-user-upload/topics/a0d4d7f86a.jpeg)

![](https://storage.googleapis.com/zenn-user-upload/topics/a0d4d7f86a.jpeg =240x)

![Altテキスト付き画像](https://storage.googleapis.com/zenn-user-upload/topics/6d4f5d69fd.jpeg)

![](https://storage.googleapis.com/zenn-user-upload/topics/6d4f5d69fd.jpeg)
*画像キャプションの例*

[![](https://storage.googleapis.com/zenn-user-upload/topics/a0d4d7f86a.jpeg =180x)](https://zenn.dev)

## テーブル

| Head | Head | Head |
| ---- | ---- | ---- |
| Text | Text | Text |
| Text | Text | Text |

## コードブロック

\`\`\`js
const great = () => {
  console.log("Awesome");
};
\`\`\`

\`\`\`ts:src/example.ts
export const hello = (name: string) => {
  return \`Hello, \${name}\`;
};
\`\`\`

\`\`\`diff ts:src/example.ts
@@ -1,5 +1,5 @@
-export const mode = "draft";
+export const mode = "published";
 export const enabled = true;
\`\`\`

## 数式

$$
e^{i\\theta} = \\cos\\theta + i\\sin\\theta
$$

インライン数式の例: $a \\ne 0$

## 引用

> 引用文
> 引用文

## 脚注

脚注の例[^1]です。インライン^[脚注の内容その2]で書くこともできます。

[^1]: 脚注の内容その1

## 区切り線

-----

## インラインスタイル

*イタリック*  
**太字**  
~~打ち消し線~~  
インラインで\`code\`を挿入する

<!-- TODO: ここに自分用メモを残せます（公開ページには表示されません） -->

## Zenn独自の記法

### メッセージ

:::message
メッセージをここに
:::

:::message alert
警告メッセージをここに
:::

### アコーディオン（トグル）

:::details タイトル
表示したい内容
:::

#### ネスト

::::details ネストされたdetails
:::message
ネストされたmessage
:::
::::

## コンテンツ埋め込み

### リンクカード（URL単体）

https://zenn.dev/zenn/articles/markdown-guide

### リンクカード（明示記法）

@[card](https://zenn.dev/zenn/articles/markdown-guide)

### X (Twitter) ポスト

https://x.com/jack/status/20

### YouTube

https://www.youtube.com/watch?v=WRVsOCh907o

### GitHub

https://github.com/octocat/Hello-World/blob/master/README

https://github.com/octocat/Spoon-Knife/blob/main/README.md#L1-L3

### GitHub Gist

@[gist](https://gist.github.com/octocat/1)

### CodePen

@[codepen](https://codepen.io/team/codepen/pen/PNaGbb)

### SlideShare

@[slideshare](1HjQw7I2v3A4B5)

### SpeakerDeck

@[speakerdeck](4f926da9cb4cd0001f00a1ff)
@[speakerdeck](4f926da9cb4cd0001f00a1ff?slide=24)

### Docswell

@[docswell](https://www.docswell.com/s/ku-suke/LK7J5V-hello-docswell)

### JSFiddle

@[jsfiddle](https://jsfiddle.net/boilerplate/vue)

### CodeSandbox

@[codesandbox](https://codesandbox.io/embed/new)

### StackBlitz

@[stackblitz](https://stackblitz.com/edit/react-ts?embed=1&file=App.tsx)

### Figma

@[figma](https://www.figma.com/file/2nR0fDGf6hL8yG8eXG7QmM/Public-Prototype)

### blueprintUE

@[blueprintue](https://blueprintue.com/render/0ovgynk-/)

## ダイアグラム（mermaid）

\`\`\`mermaid
graph TB
  A[Hard edge] -->|Link text| B(Round edge)
  B --> C{Decision}
  C -->|One| D[Result one]
  C -->|Two| E[Result two]
\`\`\`

### Chain数制限の説明用サンプル

\`\`\`mermaid
graph LR
  a --> b & c --> d
\`\`\`

## 追加メモ

- 埋め込み系はURL先の公開状態やCORS/iframe制限で表示が変わることがあります。
- 実運用時は各サービスの正式な埋め込みURLに置き換えてください。
\`\`\`ts
export const previewTarget = {
  mode: "markdown-direct",
  renderer: "zenn-markdown-html",
  target: "all-patterns-from-markdown-guide",
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
