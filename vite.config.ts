import * as dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, cpSync, existsSync } from 'fs';
import tsconfigPaths from "vite-tsconfig-paths"

dotenv.config();

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
        onboarding: resolve(__dirname, 'onboarding.html'),
        content: resolve(__dirname, 'src/content/detector.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
