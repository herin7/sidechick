import React, { useEffect, useState } from 'react';
import { sendMessage } from '../bridge.js';

export default function MernPane({ challenge, challengeStartedAt, onMessage }) {
  const [output, setOutput] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => onMessage((message) => {
    if (message?.type === 'executionOutput') {
      setOutput(message.data?.output || '');
    }

    if (message?.type === 'busy') {
      setIsBusy(Boolean(message.data?.message));
    }
  }), [onMessage]);

  function getElapsedSeconds() {
    if (!challengeStartedAt) {
      return 0;
    }

    return Math.max(0, Math.round((Date.now() - challengeStartedAt) / 1000));
  }

  return (
    <section className="workspace-pane">
      <div className="workspace-toolbar">
        <div>
          <div className="workspace-title">MERN Bugfix Runner</div>
          <div className="workspace-subtitle">Open the repo in a new window, fix it, then run verification here.</div>
        </div>
        <div className="workspace-actions">
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => sendMessage({ type: 'openMernWorkspace' })}
          >
            Open Workspace
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => sendMessage({ type: 'skipChallenge' })}
            disabled={isBusy}
          >
            Change Problem
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => sendMessage({ type: 'verifyMern', timerSeconds: getElapsedSeconds() })}
            disabled={isBusy}
          >
            Run Verification
          </button>
        </div>
      </div>

      <div className="mern-card">
        <div className="mern-card-title">Fix Flow</div>
        <ol className="flow-list">
          <li>Open the SideChick workspace in a new VS Code window.</li>
          <li>Find the failing logic and make the bundled tests pass.</li>
          <li>Come back here and run verification to record the completed challenge.</li>
        </ol>

        {challenge?.instructions?.length ? (
          <div className="instruction-stack">
            {challenge.instructions.map((line) => (
              <div key={line} className="instruction-line">{line}</div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="console-panel">
        <div className="console-header">Verification Output</div>
        <pre className="console-body">{output || 'Verification logs will appear here after you run the MERN tests.'}</pre>
      </div>
    </section>
  );
}
