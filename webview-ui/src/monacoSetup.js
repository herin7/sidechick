/**
 * monacoSetup.js
 *
 * MUST be imported before @monaco-editor/react or monaco-editor are used.
 *
 * Problem: @monaco-editor/react loads Monaco from cdn.jsdelivr.net by default.
 * In a VS Code Webview the CSP blocks all external URLs, so the editor shows
 * "Loading..." forever.
 *
 * Fix:
 *  1. Import the local monaco-editor bundle.
 *  2. Override self.MonacoEnvironment so workers are created from blob: URLs
 *     (allowed by `worker-src blob:` in the CSP).
 *  3. Call loader.config({ monaco }) to swap the CDN loader for our local copy.
 */

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';

// --- Worker setup (Vite ?worker inlines each worker as a blob: URL) ----------
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker   from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker     from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import cssWorker    from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker   from 'monaco-editor/esm/vs/language/html/html.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json')                          return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  }
};

// Tell @monaco-editor/react to use the already-imported local bundle.
loader.config({ monaco });
