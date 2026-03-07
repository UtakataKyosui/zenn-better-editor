import path from 'node:path';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rstest/core';

// Docs: https://rstest.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  testEnvironment: 'happy-dom',
  setupFiles: ['./tests/rstest.setup.ts'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      katex: 'katex/dist/katex.js',
    },
  },
});
