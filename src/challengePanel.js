const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class ChallengePanel {
  static currentPanel = undefined;
  static viewType = 'sidechickChallenge';

  static createOrShow(context, onMessage, onDispose) {
    // Open in Active window (full screen) as requested
    const column = vscode.ViewColumn.Active;

    if (ChallengePanel.currentPanel) {
      ChallengePanel.currentPanel._onMessage = onMessage;
      ChallengePanel.currentPanel._onExternalDispose = onDispose;
      ChallengePanel.currentPanel._panel.reveal(column);
      return ChallengePanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      ChallengePanel.viewType,
      'SideChick — Bonus Challenge',
      column,
      {
        enableScripts: true,
        enableCommandUris: false,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')]
      }
    );

    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'sidechick.ico');

    ChallengePanel.currentPanel = new ChallengePanel(panel, context.extensionUri, onMessage, onDispose);
    return ChallengePanel.currentPanel;
  }

  constructor(panel, extensionUri, onMessage, onDispose) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._onMessage = onMessage;
    this._onExternalDispose = onDispose;
    this._disposables = [];
    this._webviewReady = false;
    this._pendingMessages = [];
    this._disposed = false;

    this._update();

    this._panel.onDidDispose(
      () => this._disposeInternal(true),
      null,
      this._disposables
    );

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        if (typeof this._onMessage === 'function') {
          this._onMessage(message, this);
        }
      },
      null,
      this._disposables
    );
  }

  reveal() {
    this._panel.reveal(vscode.ViewColumn.Active);
  }

  hydrate(payload) {
    this._postMessage({
      type: 'hydrate',
      data: payload
    });
  }

  setChallengeData(challenge) {
    this._postMessage({
      type: 'challenge',
      data: challenge
    });
  }

  setSessionState(sessionState) {
    this._postMessage({
      type: 'sessionState',
      data: sessionState
    });
  }

  setBusy(message) {
    this._postMessage({
      type: 'busy',
      data: { message }
    });
  }

  clearBusy() {
    this._postMessage({
      type: 'busy',
      data: null
    });
  }

  sendExecutionOutput(output) {
    this._postMessage({
      type: 'executionOutput',
      data: { output }
    });
  }

  sendVerdict(verdict) {
    this._postMessage({
      type: 'verdict',
      data: verdict
    });
  }

  sendError(message) {
    this._postMessage({
      type: 'error',
      data: { message }
    });
  }

  _postMessage(message) {
    if (this._webviewReady || message.type === 'hydrate') {
      this._panel.webview.postMessage(message);
      return;
    }

    this._pendingMessages.push(message);
  }

  markReady() {
    this._webviewReady = true;
    while (this._pendingMessages.length > 0) {
      this._panel.webview.postMessage(this._pendingMessages.shift());
    }
  }

  _update() {
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  _getHtmlForWebview(webview) {
    const distPath = path.join(this._extensionUri.fsPath, 'dist');
    const indexPath = path.join(distPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SideChick</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0a0a0a;
      color: #f5f5f5;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    }
    code {
      display: inline-block;
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
    }
  </style>
</head>
<body>
  <div>
    <h2>SideChick webview not built</h2>
    <p>Run <code>npm run build:webview</code> and reload the extension.</p>
  </div>
</body>
</html>`;
    }

    let html = fs.readFileSync(indexPath, 'utf8');
    const nonce = crypto.randomBytes(16).toString('base64');
    const distUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist'));

    html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, value) => {
      if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('#')) {
        return match;
      }

      const cleaned = value.replace(/^\.?\//, '');
      return `${attr}="${distUri}/${cleaned}"`;
    });

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com`,
      `worker-src ${webview.cspSource} blob:`,
      `connect-src 'none'`
    ].join('; ');

    html = html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">\n    <meta name="sidechick-icon" content="${distUri}/sidechick.ico">`
    );
    html = html.replace(/<script(?![^>]*nonce)/g, `<script nonce="${nonce}"`);

    return html;
  }

  dispose() {
    this._disposeInternal(false);
  }

  _disposeInternal(fromPanelEvent) {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    ChallengePanel.currentPanel = undefined;

    if (!fromPanelEvent) {
      this._panel.dispose();
    }

    while (this._disposables.length > 0) {
      const disposable = this._disposables.pop();
      disposable?.dispose();
    }

    if (typeof this._onExternalDispose === 'function') {
      this._onExternalDispose();
    }
  }
}

module.exports = {
  ChallengePanel
};
