import React, { useEffect, useState } from 'react';

const ACCEPTED_STATUS_CODE = 10;

function buildFailureDetails(verdict) {
  const details = [];

  if (verdict?.error) {
    details.push(verdict.error);
  }
  if (verdict?.runtime && verdict.runtime !== 'N/A') {
    details.push(`Runtime: ${verdict.runtime}`);
  }
  if (verdict?.memory && verdict.memory !== 'N/A') {
    details.push(`Memory: ${verdict.memory}`);
  }
  if (verdict?.totalTestcases) {
    details.push(`Passed ${verdict.totalCorrect}/${verdict.totalTestcases} testcases`);
  }

  return details.join(' | ');
}

export default function VerdictOverlay({ onMessage }) {
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    const cleanup = onMessage((data) => {
      if (data?.type === 'submitting') {
        setOverlay({
          tone: 'pending',
          title: 'Submitting to LeetCode',
          message: 'Polling for verdict every 2 seconds...'
        });
        return;
      }

      if (data?.type === 'verdict') {
        const verdict = data.verdict ?? {};
        const accepted = verdict.statusCode === ACCEPTED_STATUS_CODE;

        setOverlay({
          tone: accepted ? 'accepted' : 'failed',
          title: accepted ? 'Accepted' : verdict.status || 'Failed',
          message: accepted
            ? 'All testcases passed. Closing this challenge in 2 seconds...'
            : buildFailureDetails(verdict) || 'Submission did not pass.'
        });
      }
    });

    return cleanup;
  }, [onMessage]);

  if (!overlay) {
    return null;
  }

  return (
    <div className={`verdict-overlay verdict-overlay--${overlay.tone}`} role="status" aria-live="polite">
      <div className="verdict-card">
        <div className="verdict-eyebrow">LeetCode Verdict</div>
        <h2 className="verdict-title">{overlay.title}</h2>
        <p className="verdict-message">{overlay.message}</p>
        {overlay.tone !== 'pending' ? (
          <button className="btn btn--secondary" type="button" onClick={() => setOverlay(null)}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
