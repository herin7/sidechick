const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { loadCredentials, promptAndSaveCredentials } = require('./auth');
const { submitCode, pollVerdict } = require('./providers/lc');
const { runMernTests } = require('./providers/mern');
const { reportChallengeResult } = require('./backendClient');

class ChallengePanel {
  static currentPanel = undefined;
  static viewType = 'sidechickChallenge';

  static createOrShow(context) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChallengePanel.currentPanel) {
      ChallengePanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ChallengePanel.viewType,
      'Sidechick - Challenge',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')]
      }
    );

    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'sidechick.ico');

    ChallengePanel.currentPanel = new ChallengePanel(panel, context.extensionUri, context);
  }

  static revealCurrent() {
    if (!ChallengePanel.currentPanel) {
      return;
    }

    ChallengePanel.currentPanel.reveal();
  }

  constructor(panel, extensionUri, context) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._context = context;
    this._disposables = [];
    this._webviewReady = false;
    this._pendingMessages = [];
    this._currentChallenge = null;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );
  }

  _handleMessage(message) {
    switch (message.type) {
      case 'run': {
        const mockOutput =
          `Code received by Extension Host.\n\n` +
          `Your code (${message.code.length} chars) was evaluated.\n\n` +
          `[Mock output] Output: [1, 0]`;
        this._postMessage({ type: 'result', output: mockOutput });
        break;
      }

      case 'configureAuth': {
        this._handleConfigureAuth().catch((err) => {
          this._postAuthStatus(err.message);
        });
        break;
      }

      case 'submit': {
        this._handleSubmit(message).catch((err) => {
          this._postMessage({
            type: 'verdict',
            verdict: {
              status: 'Error',
              statusCode: -1,
              error: err.message
            }
          });
        });
        break;
      }

      case 'ready': {
        this._webviewReady = true;
        this._postAuthStatus();
        this._flushPendingMessages();
        break;
      }

      default:
        break;
    }
  }

  async _handleConfigureAuth() {
    const creds = await promptAndSaveCredentials(this._context);
    this._postAuthStatus(creds ? undefined : 'Credentials were not saved.');
  }

  _postAuthStatus(error) {
    this._postMessage({
      type: 'authStatus',
      isConfigured: Boolean(loadCredentials(this._context)),
      error
    });
  }

  async _handleSubmit(message) {
    if (!this._currentChallenge) {
      throw new Error('No active challenge loaded.');
    }

    if (this._currentChallenge.type === 'mern') {
      await this._runMernSubmission(message);
      return;
    }

    await this._runLeetCodeSubmission(message);
  }

  async _runLeetCodeSubmission(message) {
    let creds = loadCredentials(this._context);

    if (!creds) {
      creds = await promptAndSaveCredentials(this._context);
      this._postAuthStatus(creds ? undefined : 'Credentials required to submit.');

      if (!creds) {
        this._postMessage({
          type: 'verdict',
          verdict: {
            status: 'Error',
            statusCode: -1,
            error: 'Credentials required to submit.'
          }
        });
        return;
      }
    }

    if (message.questionId && String(message.questionId) !== String(this._currentChallenge.questionId)) {
      throw new Error('The loaded challenge changed before submission completed.');
    }

    this._postMessage({ type: 'submitting' });

    const submissionId = await submitCode(creds, {
      titleSlug: this._currentChallenge.titleSlug,
      questionId: this._currentChallenge.questionId,
      code: message.code,
      language: message.language
    });
    const verdict = await pollVerdict(creds, submissionId);

    this._postMessage({ type: 'verdict', verdict });

    await this._reportResult({
      type: 'lc',
      problemId: this._currentChallenge.problemId,
      status: verdict.statusCode === 10 ? 'accepted' : 'failed',
      timeSecs: message.timerSeconds
    });

    if (verdict.statusCode === 10) {
      setTimeout(() => this.dispose(), 2000);
    }
  }

  async _runMernSubmission(message) {
    this._postMessage({ type: 'submitting' });

    const result = await runMernTests(this._currentChallenge.cwd);
    const verdict = {
      status: result.status,
      statusCode: result.statusCode,
      runtime: 'N/A',
      memory: 'N/A',
      output: result.output,
      error: result.statusCode === 10 ? undefined : result.output
    };

    this._postMessage({ type: 'verdict', verdict });
    if (result.output) {
      this._postMessage({ type: 'result', output: result.output });
    }

    await this._reportResult({
      type: 'mern',
      problemId: this._currentChallenge.problemId,
      status: result.statusCode === 10 ? 'passed' : 'failed',
      timeSecs: message.timerSeconds
    });
  }

  async _reportResult(payload) {
    try {
      await reportChallengeResult(payload);
    } catch (error) {
      console.warn('[Sidechick] score report failed:', error.message);
    }
  }

  setProblemData(problem) {
    this._currentChallenge = {
      type: problem.type || 'lc',
      problemId: problem.titleSlug || problem.questionId,
      questionId: problem.questionId,
      titleSlug: problem.titleSlug
    };

    this._postMessage({ type: 'problem', data: problem });
  }

  setMernChallengeData(challenge) {
    this._currentChallenge = {
      type: 'mern',
      problemId: challenge.problemId,
      questionId: challenge.webviewData.questionId,
      titleSlug: challenge.webviewData.titleSlug,
      cwd: challenge.tempDir
    };

    this._postMessage({ type: 'problem', data: challenge.webviewData });
  }

  reveal() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    this._panel.reveal(column);
  }

  sendError(errorMessage) {
    this._postMessage({ type: 'error', message: errorMessage });
  }

  _postMessage(message) {
    if (this._webviewReady) {
      this._panel.webview.postMessage(message);
      return;
    }

    this._pendingMessages.push(message);
  }

  _flushPendingMessages() {
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
      return this._getBuildPromptHtml();
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
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `worker-src blob:`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com`
    ].join('; ');

    html = html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">\n    <meta name="sidechick-icon" content="${distUri}/sidechick.ico">\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="https://fonts.googleapis.com/css2?family=Azeret+Mono:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">`
    );
    html = html.replace(/<script(?![^>]*nonce)/g, `<script nonce="${nonce}"`);

    return html;
  }

  _getBuildPromptHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sidechick</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    code {
      background: var(--vscode-textBlockQuote-background);
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      display: block;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <h2>Sidechick Webview</h2>
  <p>The React app hasn't been built yet. Run:</p>
  <code>npm run build:webview</code>
  <p style="margin-top:16px; opacity:0.6">Then reload the extension.</p>
</body>
</html>`;
  }

  dispose() {
    ChallengePanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

module.exports = { ChallengePanel };
