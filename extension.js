const vscode = require('vscode');
const { ChallengePanel } = require('./src/challengePanel');
const { promptAndSaveCredentials } = require('./src/auth');
const { fetchRandomProblem } = require('./src/providers/lc');
const { createMernChallenge } = require('./src/providers/mern');

const AUTO_PROMPT_LINE_THRESHOLD = 25;
const AUTO_PROMPT_IDLE_MS = 10000;
const AUTO_PROMPT_COOLDOWN_MS = 15000;

function setIdleStatus(statusBarItem) {
  statusBarItem.text = '$(beaker) Sidechick';
  statusBarItem.tooltip = 'Continue or start a Sidechick challenge';
}

function getChangedLineCount(event) {
  return event.contentChanges.reduce((total, change) => {
    const addedLines = change.text ? change.text.split(/\r?\n/).length - 1 : 0;
    const removedLines = Math.max(0, change.range.end.line - change.range.start.line);
    return total + Math.max(1, addedLines + removedLines);
  }, 0);
}

async function showChallengePicker(context, statusBarItem, source) {
  const hasExistingChallenge = Boolean(ChallengePanel.currentPanel);
  const items = [];

  if (hasExistingChallenge) {
    items.push({
      label: 'Continue current',
      description: 'Reveal the existing Sidechick challenge',
      value: 'continue'
    });
  }

  items.push(
    {
      label: 'New DSA',
      description: 'Load a fresh LeetCode challenge',
      value: 'dsa'
    },
    {
      label: 'New Dev',
      description: 'Open a fresh local development challenge',
      value: 'dev'
    },
    {
      label: 'Not now',
      description: 'Dismiss this prompt',
      value: 'dismiss'
    }
  );

  const selection = await vscode.window.showQuickPick(items, {
    title: 'Sidechick',
    placeHolder:
      source === 'activity'
        ? 'Sidechick is ready. Continue your current challenge or start a new one.'
        : 'Choose a Sidechick challenge mode.'
  });

  if (!selection || selection.value === 'dismiss') {
    return;
  }

  if (selection.value === 'continue' && ChallengePanel.currentPanel) {
    ChallengePanel.currentPanel.reveal();
    return;
  }

  if (selection.value === 'dev') {
    await startDevChallenge(context, statusBarItem);
    return;
  }

  await startDsaChallenge(context, statusBarItem);
}

async function startDsaChallenge(context, statusBarItem) {
  ChallengePanel.createOrShow(context);
  const panel = ChallengePanel.currentPanel;

  statusBarItem.text = '$(sync~spin) Loading DSA...';
  statusBarItem.tooltip = 'Fetching a LeetCode problem...';

  try {
    const problem = await fetchRandomProblem('MEDIUM');
    if (panel) {
      panel.setProblemData(problem);
    }
  } catch (err) {
    if (panel) {
      panel.sendError(
        `Could not fetch a LeetCode problem.\n\nReason: ${err.message}\n\nCheck your connection and try again.`
      );
    } else {
      vscode.window.showErrorMessage(`Sidechick: ${err.message}`);
    }
  } finally {
    setIdleStatus(statusBarItem);
  }
}

async function startDevChallenge(context, statusBarItem) {
  statusBarItem.text = '$(sync~spin) Loading Dev...';
  statusBarItem.tooltip = 'Preparing a local development challenge...';

  try {
    const challenge = await createMernChallenge();
    if (ChallengePanel.currentPanel) {
      ChallengePanel.currentPanel.dispose();
    }

    await vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.file(challenge.tempDir),
      true
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Sidechick: ${err.message}`);
  } finally {
    setIdleStatus(statusBarItem);
  }
}

function registerAutoPromptWatcher(context, statusBarItem) {
  let accumulatedChangedLines = 0;
  let idleTimer;
  let promptInFlight = false;
  let lastPromptAt = 0;

  const resetActivity = () => {
    accumulatedChangedLines = 0;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const maybeShowPrompt = async (source) => {
    const now = Date.now();
    if (promptInFlight || now - lastPromptAt < AUTO_PROMPT_COOLDOWN_MS) {
      return;
    }

    promptInFlight = true;
    lastPromptAt = now;

    try {
      await showChallengePicker(context, statusBarItem, source);
    } finally {
      promptInFlight = false;
      resetActivity();
    }
  };

  const scheduleIdlePrompt = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    idleTimer = setTimeout(() => {
      maybeShowPrompt('activity').catch((error) => {
        console.warn('[Sidechick] auto prompt failed:', error.message);
      });
    }, AUTO_PROMPT_IDLE_MS);
  };

  const textChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.scheme !== 'file' || event.contentChanges.length === 0) {
      return;
    }

    accumulatedChangedLines += getChangedLineCount(event);

    if (accumulatedChangedLines >= AUTO_PROMPT_LINE_THRESHOLD) {
      maybeShowPrompt('activity').catch((error) => {
        console.warn('[Sidechick] auto prompt failed:', error.message);
      });
      return;
    }

    scheduleIdlePrompt();
  });

  context.subscriptions.push(textChangeDisposable);
  context.subscriptions.push({
    dispose: () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    }
  });
}

function activate(context) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'sidechick.startChallenge';
  setIdleStatus(statusBarItem);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const helloDisposable = vscode.commands.registerCommand(
    'sidechick.helloWorld',
    () => vscode.window.showInformationMessage('Hello World from sidechick!')
  );

  const configureAuthDisposable = vscode.commands.registerCommand(
    'sidechick.configureLeetCodeAuth',
    async () => {
      await promptAndSaveCredentials(context);
    }
  );

  const challengeDisposable = vscode.commands.registerCommand(
    'sidechick.startChallenge',
    async () => {
      await showChallengePicker(context, statusBarItem, 'manual');
    }
  );

  const mernDisposable = vscode.commands.registerCommand(
    'sidechick.startMernBugMode',
    async () => {
      await startDevChallenge(context, statusBarItem);
    }
  );

  context.subscriptions.push(
    helloDisposable,
    configureAuthDisposable,
    challengeDisposable,
    mernDisposable
  );

  registerAutoPromptWatcher(context, statusBarItem);
}

function deactivate() { }

module.exports = { activate, deactivate };
