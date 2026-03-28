import React, { useEffect, useState } from 'react';
import ProblemPane from './components/ProblemPane.jsx';
import EditorPane from './components/EditorPane.jsx';
import VerdictOverlay from './components/VerdictOverlay.jsx';
import { sendMessage, onMessage } from './bridge.js';

const difficultyToBadge = {
  EASY: 'badge--easy',
  MEDIUM: 'badge--medium',
  HARD: 'badge--hard',
  MERN: 'badge--mern'
};

const sidechickIconSrc =
  document.querySelector('meta[name="sidechick-icon"]')?.getAttribute('content') ?? '';

export default function App() {
  const [problem, setProblem] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [challengeStartedAt, setChallengeStartedAt] = useState(null);

  useEffect(() => {
    sendMessage({ type: 'ready' });

    const cleanup = onMessage((data) => {
      if (data?.type === 'problem') {
        setProblem(data.data);
        setFetchError(null);
        setChallengeStartedAt(Date.now());
      } else if (data?.type === 'error') {
        setFetchError(data.message);
        setProblem(null);
      } else if (data?.type === 'authStatus') {
        setAuthConfigured(Boolean(data.isConfigured));
        setAuthError(data.error ?? null);
      }
    });

    return cleanup;
  }, []);

  const difficultyClass = difficultyToBadge[problem?.difficulty] || 'badge--medium';

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          {sidechickIconSrc ? (
            <img className="logo-icon-image" src={sidechickIconSrc} alt="Sidechick" />
          ) : (
            <div className="logo-icon-fallback" aria-hidden="true" />
          )}
        </div>

        <div className="header-meta">
          {problem ? (
            <>
              <span className={`badge ${difficultyClass}`}>{problem.difficulty}</span>
              <span className="problem-title">
                {problem.questionId}. {problem.title}
              </span>
            </>
          ) : fetchError ? (
            <span className="badge badge--hard">Error</span>
          ) : (
            <span className="header-loading-pill">
              <span className="spinner" />
              Fetching problem...
            </span>
          )}
        </div>

        <div className="header-actions">
          <button
            className={`auth-pill ${authConfigured ? 'auth-pill--configured' : ''}`}
            onClick={() => sendMessage({ type: 'configureAuth' })}
            type="button"
          >
            {authConfigured ? 'Auth Ready' : 'Set Auth'}
          </button>
        </div>
      </header>

      {authError ? <div className="auth-banner">{authError}</div> : null}

      <main className="app-main">
        <ProblemPane problem={problem} error={fetchError} />
        <EditorPane
          problem={problem}
          challengeStartedAt={challengeStartedAt}
          onRun={(code) => sendMessage({ type: 'run', code })}
          onSubmit={(payload) => sendMessage({ type: 'submit', ...payload })}
          onMessage={onMessage}
        />
      </main>

      <VerdictOverlay onMessage={onMessage} />
    </div>
  );
}
