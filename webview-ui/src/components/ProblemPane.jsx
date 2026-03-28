import React from 'react';

/* ── Skeleton loader for individual lines ─────────────────────── */
function Skeleton({ width = '100%', height = '14px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/* ── Loading state — mimics the pane layout with animated pulses ─ */
function ProblemSkeleton() {
  return (
    <aside className="problem-pane">
      <div className="problem-header">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Skeleton width="48px" height="22px" style={{ borderRadius: 20 }} />
          <Skeleton width="60%" height="22px" style={{ borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width="60px" height="20px" style={{ borderRadius: 20 }} />
          <Skeleton width="60px" height="20px" style={{ borderRadius: 20 }} />
          <Skeleton width="80px" height="20px" style={{ borderRadius: 20 }} />
        </div>
      </div>
      <div className="problem-body">
        <Skeleton height="13px" style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height="13px" style={{ marginBottom: 8 }} />
        <Skeleton width="75%" height="13px" style={{ marginBottom: 24 }} />

        <Skeleton width="30%" height="13px" style={{ marginBottom: 10 }} />
        <div className="example-block" style={{ marginBottom: 16 }}>
          <Skeleton width="70%" height="12px" style={{ marginBottom: 6 }} />
          <Skeleton width="50%" height="12px" />
        </div>
        <div className="example-block" style={{ marginBottom: 24 }}>
          <Skeleton width="70%" height="12px" style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height="12px" />
        </div>

        <Skeleton width="25%" height="13px" style={{ marginBottom: 10 }} />
        <Skeleton width="85%" height="12px" style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height="12px" style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height="12px" />
      </div>
    </aside>
  );
}

/* ── Error state ──────────────────────────────────────────────── */
function ProblemError({ message }) {
  return (
    <aside className="problem-pane">
      <div className="problem-error-state">
        <div className="problem-error-icon">⚠️</div>
        <h2 className="problem-error-title">Failed to load problem</h2>
        <pre className="problem-error-message">{message}</pre>
        <p className="problem-error-hint">
          Try closing this panel and triggering{' '}
          <strong>⚗ Start Challenge</strong> again.
        </p>
      </div>
    </aside>
  );
}

/* ── Main component ───────────────────────────────────────────── */

/**
 * @param {{ problem: object|null, error: string|null }} props
 */
export default function ProblemPane({ problem, error }) {
  if (error) return <ProblemError message={error} />;
  if (!problem) return <ProblemSkeleton />;

  const { questionId, title, difficulty, content, acRate, tags } = problem;

  return (
    <aside className="problem-pane">
      {/* ── Problem header ── */}
      <div className="problem-header">
        <h1 className="problem-number-title">
          <span className="problem-num">{questionId}.</span> {title}
        </h1>
        <div className="problem-meta">
          <span className={`badge badge--${difficulty.toLowerCase()}`}>
            {difficulty}
          </span>
          {acRate != null && (
            <span className="accept-rate">✓ {acRate.toFixed(1)}%</span>
          )}
        </div>
        {tags && tags.length > 0 && (
          <div className="problem-tags">
            {tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Problem body: raw LC HTML ── */}
      <div className="problem-body">
        <div
          className="lc-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </aside>
  );
}
