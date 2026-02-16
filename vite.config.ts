import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync } from 'fs';
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.CLAUDE_API_KEY': JSON.stringify('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'),
  },
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json');
        if (existsSync('static')) cpSync('static', 'dist/static', { recursive: true });
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content/detector.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
