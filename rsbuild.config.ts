import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  dev: {
    // Avoid repeated "build started/ready" logs caused by on-demand compilation
    // for dynamic imports (Shiki, Mermaid, embed runtime, etc.) on initial load.
    lazyCompilation: false,
  },
  html: {
    title: 'Rich Zenn Editor',
    tags: [
      {
        tag: 'style',
        head: true,
        append: false,
        children:
          'html,body,#root{min-height:100%;}body{margin:0;background:#08111f;color:#e8ecf3;font-family:"IBM Plex Sans","Noto Sans JP",sans-serif;}',
      },
    ],
  },
  resolve: {
    alias: {
      katex: 'katex/dist/katex.js',
    },
  },
});
