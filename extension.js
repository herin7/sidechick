const vscode = require('vscode');
const { ChallengePanel } = require('./src/challengePanel');
const {
  clearStoredAuth,
  getSessionState,
  hasSeenOnboarding,
  markOnboardingSeen,
  setAnonymousMode,
  signInWithGitHub
} = require('./src/auth');
const { createBackendClient } = require('./src/backendClient');
const { LeetCodeAPI } = require('./src/providers/leetcodeApi');
const {
  createChallenge,
  openDevWorkspace,
  runDsaCode,
  verifyDevChallenge
} = require('./src/challengeService');

// ── Bulk-insert detection config ────────────────────────────────────
const BULK_INSERT_LINE_THRESHOLD = 50;
const TRIGGER_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

function createRuntime(context) {
  return {
    context,
    apiClient: createBackendClient(context),
    lcApi: new LeetCodeAPI(context),
    statusBarItem: null,
    currentChallenge: null,
    currentRunAborter: null,
    currentSessionState: {
      isAnonymous: false,
      isAuthenticated: false,
      user: null,
      streak: 0,
      solved: 0
    },
    lastTriggerAt: 0
  };
}

function updateStatusBar(runtime) {
  if (runtime.currentSessionState.isAuthenticated) {
    runtime.statusBarItem.text = `$(flame) SideChick ${runtime.currentSessionState.streak}`;
    runtime.statusBarItem.tooltip = `Signed in as ${runtime.currentSessionState.user?.handle || 'GitHub user'}`;
    return;
  }

  if (runtime.currentSessionState.isAnonymous) {
    runtime.statusBarItem.text = '$(beaker) SideChick Anonymous';
    runtime.statusBarItem.tooltip = 'Anonymous mode: local challenges only, no cloud sync.';
    return;
  }

  runtime.statusBarItem.text = '$(beaker) SideChick';
  runtime.statusBarItem.tooltip = 'Start a SideChick challenge or sign in with GitHub.';
}

async function refreshSessionState(runtime) {
  runtime.currentSessionState = await getSessionState(runtime.context, runtime.apiClient);
  updateStatusBar(runtime);

  if (ChallengePanel.currentPanel) {
    ChallengePanel.currentPanel.setSessionState(runtime.currentSessionState);
  }
}

async function hydratePanel(runtime, panel, source) {
  panel.hydrate({
    challenge: runtime.currentChallenge?.webviewData || null,
    sessionState: {
      ...runtime.currentSessionState,
      source
    }
  });
}

function clearCurrentChallenge(runtime) {
  runtime.currentChallenge = null;
  updateStatusBar(runtime);
}

async function maybeCloseChallenge(runtime, isMern) {
  clearCurrentChallenge(runtime);

  if (isMern) {
    vscode.window.showInformationMessage('Challenge complete! You can now safely close the Dev workspace window.');
  }

  if (ChallengePanel.currentPanel) {
    setTimeout(() => {
      ChallengePanel.currentPanel?.dispose();
    }, 1200);
  }
}

async function reportChallengePass(runtime, challenge, timeSecs) {
  if (!runtime.currentSessionState.isAuthenticated) {
    return;
  }

  try {
    await runtime.apiClient.reportChallengeResult({
      type: challenge.scoringType,
      problemId: challenge.problemId,
      status: challenge.kind === 'mern' ? 'passed' : 'accepted',
      timeSecs
    });

    await refreshSessionState(runtime);
  } catch (error) {
    console.warn('[SideChick] score sync failed after a successful challenge:', error.message);
    vscode.window.showWarningMessage(
      'SideChick recorded a local pass, but cloud score sync failed for this session.'
    );
  }
}

async function runDsa(runtime, code, langSlug, publicOnly, timerSeconds) {
  const panel = ChallengePanel.currentPanel;
  if (!panel || !runtime.currentChallenge) {
    return;
  }

  panel.setBusy(publicOnly ? 'Running sample tests...' : 'Checking your solution...');

  const aborter = { cancelled: false };
  runtime.currentRunAborter = aborter;

  try {
    let result;
    if (runtime.currentChallenge.webviewData?.isLcApi) {
      if (!runtime.lcApi.isAuthenticated()) {
        throw new Error('You must log in to LeetCode (Command: `Sidechick: Sign in to LeetCode`) to submit live challenges.');
      }
      const q = runtime.currentChallenge.webviewData;
      const runId = publicOnly
        ? await runtime.lcApi.interpretSolution(q.titleSlug, q.questionId, code, langSlug, q.sampleTestCase || "")
        : await runtime.lcApi.submitSolution(q.titleSlug, q.questionId, code, langSlug);

      const pollRes = await runtime.lcApi.pollSubmissionResult(runId, aborter);

      let statusCode = pollRes.status_code === 10 ? 10 : -1;
      let output = `Status: ${pollRes.status_msg || 'Unknown'}\n`;
      if (pollRes.compile_error) output += `\nCompile Error:\n${pollRes.compile_error}\n`;
      if (pollRes.runtime_error) output += `\nRuntime Error:\n${pollRes.runtime_error}\n`;
      if (pollRes.code_output) output += `\nStdout:\n${pollRes.code_output}\n`;
      if (pollRes.expected_output) output += `\nExpected:\n${pollRes.expected_output}\n`;
      if (!publicOnly && pollRes.total_correct !== undefined) {
        output += `\nPassed ${pollRes.total_correct} / ${pollRes.total_testcases} testcases.`;
      }

      result = {
        output,
        verdict: {
          status: pollRes.status_msg || (statusCode === 10 ? 'Accepted' : 'Finished'),
          statusCode,
          output: output.trim(),
          error: statusCode === 10 ? undefined : 'Check output'
        }
      };
    } else {
      result = await runDsaCode(runtime.currentChallenge, code, { publicOnly, langSlug });
    }

    if (aborter.cancelled) return;

    panel.clearBusy();
    panel.sendExecutionOutput(result.output);
    panel.sendVerdict(result.verdict);

    if (!publicOnly && result.verdict.statusCode === 10) {
      await reportChallengePass(runtime, runtime.currentChallenge, timerSeconds);
      await maybeCloseChallenge(runtime);
    }
  } catch (error) {
    if (aborter.cancelled) return;
    panel.clearBusy();
    panel.sendVerdict({
      status: 'Failed',
      statusCode: -1,
      error: error.message,
      output: error.message
    });
  } finally {
    if (runtime.currentRunAborter === aborter) {
      runtime.currentRunAborter = null;
    }
  }
}

async function runMern(runtime, timerSeconds) {
  const panel = ChallengePanel.currentPanel;
  if (!panel || !runtime.currentChallenge) {
    return;
  }

  panel.setBusy('Running MERN verification...');

  try {
    const result = await verifyDevChallenge(runtime.currentChallenge);
    panel.clearBusy();
    panel.sendExecutionOutput(result.output || 'No test output was captured.');
    panel.sendVerdict({
      status: result.status,
      statusCode: result.statusCode,
      output: result.output,
      error: result.statusCode === 10 ? undefined : result.output
    });

    if (result.statusCode === 10) {
      await reportChallengePass(runtime, runtime.currentChallenge, timerSeconds);
      await maybeCloseChallenge(runtime, true);
    }
  } catch (error) {
    panel.clearBusy();
    panel.sendVerdict({
      status: 'Failed',
      statusCode: -1,
      output: error.message,
      error: error.message
    });
  }
}

async function handlePanelMessage(runtime, message, panel, source) {
  switch (message?.type) {
    case 'ready':
      panel.markReady();
      await hydratePanel(runtime, panel, source);
      break;

    case 'loginWithGithub':
      try {
        panel.setBusy('Signing in with GitHub...');
        const result = await signInWithGitHub(runtime.context, runtime.apiClient);
        panel.clearBusy();

        if (!result) {
          panel.sendError('GitHub sign-in was cancelled.');
          return;
        }

        await refreshSessionState(runtime);
        panel.setSessionState({
          ...runtime.currentSessionState,
          source
        });
      } catch (error) {
        panel.clearBusy();
        panel.sendError(`GitHub sign-in failed: ${error.message}`);
      }
      break;

    case 'continueAnonymous':
      await setAnonymousMode(runtime.context, true);
      await clearStoredAuth(runtime.context);
      await refreshSessionState(runtime);
      panel.setSessionState({
        ...runtime.currentSessionState,
        source
      });
      break;

    case 'runDsa':
      await runDsa(runtime, String(message.code || ''), String(message.langSlug || 'javascript'), true, Number(message.timerSeconds || 0));
      break;

    case 'submitDsa':
      await runDsa(runtime, String(message.code || ''), String(message.langSlug || 'javascript'), false, Number(message.timerSeconds || 0));
      break;

    case 'cancelRun':
      if (runtime.currentRunAborter) {
        runtime.currentRunAborter.cancelled = true;
        panel.clearBusy();
        panel.sendExecutionOutput('Execution cancelled by user.');
      }
      break;

    case 'skipChallenge':
      if (runtime.currentChallenge) {
        clearCurrentChallenge(runtime);
        await openChallenge(runtime, { source: 'manual', forcedMode: runtime.currentChallenge?.mode });
      }
      break;

    case 'openMernWorkspace':
      if (runtime.currentChallenge?.kind === 'mern') {
        await openDevWorkspace(runtime.currentChallenge);
      }
      break;

    case 'verifyMern':
      await runMern(runtime, Number(message.timerSeconds || 0));
      break;

    default:
      break;
  }
}

async function openChallenge(runtime, options = {}) {
  if (ChallengePanel.currentPanel && runtime.currentChallenge) {
    const existingPanel = ChallengePanel.createOrShow(
      runtime.context,
      (message, currentPanel) => handlePanelMessage(runtime, message, currentPanel, options.source),
      () => clearCurrentChallenge(runtime)
    );
    await hydratePanel(runtime, existingPanel, options.source);
    existingPanel.reveal();
    return;
  }

  const panel = ChallengePanel.createOrShow(
    runtime.context,
    (message, currentPanel) => handlePanelMessage(runtime, message, currentPanel, options.source),
    () => clearCurrentChallenge(runtime)
  );
  panel.setBusy('Preparing your SideChick challenge...');

  try {
    runtime.currentChallenge = await createChallenge({
      apiClient: runtime.apiClient,
      lcApi: runtime.lcApi,
      sessionState: runtime.currentSessionState,
      forcedMode: options.forcedMode
    });

    panel.clearBusy();
    panel.setChallengeData(runtime.currentChallenge.webviewData);
    await hydratePanel(runtime, panel, options.source);
    panel.reveal();
  } catch (error) {
    clearCurrentChallenge(runtime);
    panel.clearBusy();
    panel.sendError(error.message);
    vscode.window.showErrorMessage(`SideChick: ${error.message}`);
  }
}

async function runOnboarding(runtime) {
  if (hasSeenOnboarding(runtime.context)) {
    return;
  }

  await markOnboardingSeen(runtime.context);

  const selection = await vscode.window.showInformationMessage(
    'SideChick: Gamify your AI-assisted coding. Log in with GitHub for streaks & leaderboards, or go anonymous.',
    'Log in with GitHub',
    'Continue Anonymously'
  );

  if (selection === 'Log in with GitHub') {
    try {
      await signInWithGitHub(runtime.context, runtime.apiClient);
      await refreshSessionState(runtime);
      vscode.window.showInformationMessage('SideChick is connected to GitHub.');
    } catch (error) {
      vscode.window.showErrorMessage(`SideChick sign-in failed: ${error.message}`);
    }
    return;
  }

  if (selection === 'Continue Anonymously') {
    await setAnonymousMode(runtime.context, true);
    await clearStoredAuth(runtime.context);
    await refreshSessionState(runtime);
  }
}

// ── New trigger: detect bulk AI insertions via onDidChangeTextDocument ──

function registerBulkInsertTrigger(runtime) {
  runtime.context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      // Ignore output channels, git, etc.
      if (event.document.uri.scheme !== 'file') {
        return;
      }

      for (const change of event.contentChanges) {
        const insertedLineCount = change.text.split('\n').length;

        if (insertedLineCount >= BULK_INSERT_LINE_THRESHOLD) {
          // Debounce: don't spam the user
          const now = Date.now();
          if (now - runtime.lastTriggerAt < TRIGGER_DEBOUNCE_MS) {
            return;
          }

          runtime.lastTriggerAt = now;

          console.log(
            `[SideChick] Bulk insertion detected: ${insertedLineCount} lines in ${event.document.fileName}`
          );

          vscode.window
            .showInformationMessage(
              `🐣 Your AI just dropped ${insertedLineCount} lines. Want to earn a streak point?`,
              'DSA Challenge',
              'Dev Challenge',
              'Not now'
            )
            .then((choice) => {
              if (choice === 'DSA Challenge') {
                openChallenge(runtime, { source: 'ai-bulk-insert', forcedMode: 'dsa' });
              } else if (choice === 'Dev Challenge') {
                openChallenge(runtime, { source: 'ai-bulk-insert', forcedMode: 'dev' });
              }
            });

          return; // one trigger per event is enough
        }
      }
    })
  );
}

async function activate(context) {
  const runtime = createRuntime(context);

  runtime.statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  runtime.statusBarItem.command = 'sidechick.startChallenge';
  runtime.statusBarItem.show();
  context.subscriptions.push(runtime.statusBarItem);

  await runtime.lcApi.loadAuth();
  await refreshSessionState(runtime);
  await runOnboarding(runtime);

  context.subscriptions.push(
    vscode.commands.registerCommand('sidechick.startChallenge', async () => {
      const selection = await vscode.window.showQuickPick(
        [
          { label: '$(code) DSA Challenge', description: 'Algorithms & Data Structures', value: 'dsa' },
          { label: '$(tools) Dev Challenge', description: 'MERN Stack Bugfix', value: 'dev' }
        ],
        { placeHolder: 'Select a SideChick challenge mode' }
      );

      if (selection) {
        await openChallenge(runtime, { source: 'manual', forcedMode: selection.value });
      }
    }),
    vscode.commands.registerCommand('sidechick.startMernBugMode', async () => {
      await openChallenge(runtime, { source: 'manual-dev', forcedMode: 'dev' });
    }),
    vscode.commands.registerCommand('sidechick.signInWithGitHub', async () => {
      await signInWithGitHub(runtime.context, runtime.apiClient);
      await refreshSessionState(runtime);
      vscode.window.showInformationMessage('SideChick signed in with GitHub.');
    }),
    vscode.commands.registerCommand('sidechick.loginLeetCode', async () => {
      const session = await vscode.window.showInputBox({
        prompt: 'Enter your LEETCODE_SESSION cookie',
        password: true,
        ignoreFocusOut: true
      });
      if (!session) return;

      const csrf = await vscode.window.showInputBox({
        prompt: 'Enter your csrftoken cookie',
        password: true,
        ignoreFocusOut: true
      });
      if (!csrf) return;

      await runtime.lcApi.setAuth(session, csrf);
      vscode.window.showInformationMessage('Successfully saved LeetCode credentials!');
    }),
    vscode.commands.registerCommand('sidechick.continueAnonymously', async () => {
      await setAnonymousMode(runtime.context, true);
      await clearStoredAuth(runtime.context);
      await refreshSessionState(runtime);
      vscode.window.showInformationMessage('SideChick is now running anonymously.');
    })
  );

  registerBulkInsertTrigger(runtime);
  updateStatusBar(runtime);
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
