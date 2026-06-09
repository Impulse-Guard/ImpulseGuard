import * as dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync } from 'fs';
import tsconfigPaths from "vite-tsconfig-paths"

dotenv.config();

// The content script is injected into pages as a classic script (MV3 content
// scripts don't support ES modules), so it must be a single self-contained
// file. We build it in its own pass (BUILD_TARGET=content) with
// inlineDynamicImports so shared modules like the design tokens are bundled in
// rather than split into a separate chunk it can't import at runtime.
const isContentBuild = process.env.BUILD_TARGET === 'content';

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.CLAUDE_API_KEY': JSON.stringify(process.env.CLAUDE_API_KEY),
  },
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Only the popup pass copies static assets; the content pass appends to
        // the same dist/ without emptying it.
        if (isContentBuild) return;
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
    emptyOutDir: !isContentBuild,
    rollupOptions: isContentBuild
      ? {
          input: { content: resolve(__dirname, 'src/content/detector.ts') },
          output: {
            inlineDynamicImports: true,
            entryFileNames: '[name].js',
            assetFileNames: '[name].[ext]',
          },
        }
      : {
          input: { popup: resolve(__dirname, 'popup.html') },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name].[ext]',
          },
        },
  },
});
