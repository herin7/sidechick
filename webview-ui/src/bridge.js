/**
 * Webview ↔ Extension Host postMessage bridge.
 *
 * acquireVsCodeApi() can only be called ONCE per webview lifetime,
 * so we cache the result at module scope.
 */

// In production (inside a VS Code webview), acquireVsCodeApi is injected globally.
// In local Vite dev mode it won't exist — we shim it so dev builds don't crash.
const vscode = (() => {
  if (typeof acquireVsCodeApi !== 'undefined') {
    return acquireVsCodeApi(); // eslint-disable-line no-undef
  }
  // Dev shim
  console.warn('[bridge] acquireVsCodeApi not found — using dev shim');
  return {
    postMessage: (msg) => console.log('[bridge shim] postMessage:', msg),
    getState: () => ({}),
    setState: () => {}
  };
})();

/**
 * Send a message to the Extension Host.
 * @param {{ type: string, [key: string]: any }} message
 */
export function sendMessage(message) {
  vscode.postMessage(message);
}

/**
 * Register a listener for messages coming FROM the Extension Host.
 * Returns a cleanup function — call it to remove the listener.
 * @param {(data: any) => void} handler
 * @returns {() => void}
 */
export function onMessage(handler) {
  const listener = (event) => handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

/**
 * Persist state within the webview (survives hide/show cycles).
 */
export const state = {
  get: () => vscode.getState() ?? {},
  set: (newState) => vscode.setState(newState)
};
