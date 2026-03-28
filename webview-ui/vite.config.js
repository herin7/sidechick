import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Required for VS Code WebviewPanel — all asset paths must be relative.
  base: './',

  build: {
    // Output directly into the extension root's dist/ folder.
    outDir: '../dist',
    emptyOutDir: true,

    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  worker: {
    // 'es' format lets Vite bundle ?worker imports properly as blob:-able modules.
    // The webview CSP has `worker-src blob:` to allow these.
    format: 'es'
  },

  optimizeDeps: {
    // Pre-bundle monaco-editor so Vite doesn't try to re-process it on-the-fly.
    include: ['monaco-editor']
  }
});
