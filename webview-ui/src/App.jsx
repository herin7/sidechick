import React, { useEffect, useMemo, useState } from 'react';
import EditorPane from './components/EditorPane.jsx';
import MernPane from './components/MernPane.jsx';
import ProblemPane from './components/ProblemPane.jsx';
import VerdictOverlay from './components/VerdictOverlay.jsx';
import { onMessage, sendMessage } from './bridge.js';

const sidechickIconSrc =
  document.querySelector('meta[name="sidechick-icon"]')?.getAttribute('content') ?? '';

const emptySession = {
  isAnonymous: false,
  isAuthenticated: false,
  user: null,
  streak: 0,
  solved: 0,
  source: 'manual'
};

const fireIcon = String.fromCodePoint(0x1F525);
const chickenIcon = String.fromCodePoint(0x1F423);

export default function App() {
  const [challenge, setChallenge] = useState(null);
  const [sessionState, setSessionState] = useState(emptySession);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyMessage, setBusyMessage] = useState('');
  const [challengeStartedAt, setChallengeStartedAt] = useState(null);

  useEffect(() => {
    sendMessage({ type: 'ready' });

    return onMessage((message) => {
      if (message?.type === 'hydrate') {
        setChallenge(message.data?.challenge || null);
        setSessionState({ ...emptySession, ...(message.data?.sessionState || {}) });
        setChallengeStartedAt(message.data?.challenge ? Date.now() : null);
        return;
      }

      if (message?.type === 'challenge') {
        setChallenge(message.data || null);
        setErrorMessage('');
        setChallengeStartedAt(Date.now());
        return;
      }

      if (message?.type === 'sessionState') {
        setSessionState({ ...emptySession, ...(message.data || {}) });
        return;
      }

      if (message?.type === 'error') {
        setErrorMessage(message.data?.message || 'Something went wrong.');
        return;
      }

      if (message?.type === 'busy') {
        setBusyMessage(message.data?.message || '');
      }
    });
  }, []);

  const statusPill = useMemo(() => {
    if (sessionState.isAuthenticated) {
      return `Streak ${sessionState.streak}`;
    }

    if (sessionState.isAnonymous) {
      return 'Anonymous Mode';
    }

    return 'GitHub Optional';
  }, [sessionState]);

  const triggerLabel = useMemo(() => {
    const src = sessionState.source || 'manual';
    if (src === 'ai-bulk-insert') return 'AI Bulk Insert';
    if (src === 'manual-dev') return 'Manual (Dev)';
    return src.charAt(0).toUpperCase() + src.slice(1);
  }, [sessionState.source]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          {sidechickIconSrc ? (
            <img className="brand-icon" src={sidechickIconSrc} alt="SideChick" />
          ) : (
            <div className="brand-fallback" aria-hidden="true" />
          )}
          <div>
            <div className="brand-eyebrow">{chickenIcon} Bonus Challenge</div>
            <div className="brand-title">Your AI just did heavy lifting — race it for a streak point!</div>
          </div>
        </div>

        <div className="header-right">
          <div className={`status-pill ${sessionState.isAuthenticated ? 'status-pill--hot' : ''}`}>
            {sessionState.isAuthenticated ? `${fireIcon} ` : ''}
            {statusPill}
          </div>
          {sessionState.isAuthenticated ? (
            <div className="user-pill">@{sessionState.user?.handle || 'github-user'}</div>
          ) : (
            <div className="header-actions">
              {!sessionState.isAnonymous ? (
                <button
                  type="button"
                  className="pill-button"
                  onClick={() => sendMessage({ type: 'loginWithGithub' })}
                >
                  Log in with GitHub
                </button>
              ) : null}
              {!sessionState.isAnonymous ? (
                <button
                  type="button"
                  className="pill-button pill-button--ghost"
                  onClick={() => sendMessage({ type: 'continueAnonymous' })}
                >
                  Continue Anonymous
                </button>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <div className="top-strip">
        <span className="strip-label">Trigger</span>
        <span className="strip-value">{triggerLabel}</span>
        <span className="strip-label">Mode</span>
        <span className="strip-value">{challenge?.type === 'mern' ? 'Dev' : 'DSA'}</span>
        {busyMessage ? (
          <>
            <span className="strip-label">Status</span>
            <span className="strip-value">{busyMessage}</span>
          </>
        ) : null}
      </div>

      <main className="app-main">
        <ProblemPane challenge={challenge} error={errorMessage} />
        {challenge?.type === 'mern' ? (
          <MernPane
            challenge={challenge}
            onMessage={onMessage}
            challengeStartedAt={challengeStartedAt}
          />
        ) : (
          <EditorPane
            challenge={challenge}
            onMessage={onMessage}
            challengeStartedAt={challengeStartedAt}
          />
        )}
      </main>

      <VerdictOverlay onMessage={onMessage} />
    </div>
  );
}
