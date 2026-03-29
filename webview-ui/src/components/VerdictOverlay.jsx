import React, { useEffect, useState } from 'react';

const trophyIcon = String.fromCodePoint(0x1F3C6);
const retryIcon = String.fromCodePoint(0x1F504);

export default function VerdictOverlay({ onMessage }) {
  const [verdict, setVerdict] = useState(null);

  useEffect(() => onMessage((message) => {
    if (message?.type === 'verdict') {
      setVerdict(message.data || null);
    }
  }), [onMessage]);

  if (!verdict) {
    return null;
  }

  const passed = Number(verdict.statusCode) === 10;

  return (
    <div className={`overlay overlay--${passed ? 'success' : 'failure'}`} role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="overlay-kicker">{passed ? `${trophyIcon} Streak Point Earned!` : `${retryIcon} Not quite`}</div>
        <h2 className="overlay-title">{verdict.status || (passed ? 'Nailed It' : 'Keep Going')}</h2>
        <p className="overlay-copy">
          {passed
            ? 'Nice — you just out-coded your AI. Streak updated.'
            : verdict.output || verdict.error || 'Give it another shot.'}
        </p>
        <button type="button" className="action-button action-button--ghost" onClick={() => setVerdict(null)}>
          {passed ? 'Close' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
