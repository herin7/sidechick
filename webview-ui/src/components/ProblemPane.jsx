import React from 'react';

function ProblemSkeleton() {
  return (
    <aside className="problem-pane">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line short" />
      <div className="skeleton skeleton--card" />
      <div className="skeleton skeleton--card" />
    </aside>
  );
}

export default function ProblemPane({ challenge, error }) {
  if (error) {
    return (
      <aside className="problem-pane">
        <div className="problem-card problem-card--error">
          <div className="problem-heading">Challenge Load Failed</div>
          <pre className="problem-error">{error}</pre>
        </div>
      </aside>
    );
  }

  if (!challenge) {
    return <ProblemSkeleton />;
  }

  return (
    <aside className="problem-pane">
      <div className="problem-card">
        <div className="problem-meta">
          <span className={`meta-pill meta-pill--${String(challenge.difficulty || 'medium').toLowerCase()}`}>
            {challenge.difficulty}
          </span>
          <span className="meta-pill">{challenge.type === 'mern' ? 'Dev' : challenge.type.toUpperCase()}</span>
          <span className="meta-pill">{challenge.source || 'local'}</span>
        </div>

        <h1 className="problem-title">
          <span className="problem-id">{challenge.questionId}.</span> {challenge.title}
        </h1>

        {challenge.tags?.length ? (
          <div className="tag-row">
            {challenge.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        ) : null}

        <div
          className="problem-copy"
          dangerouslySetInnerHTML={{ __html: challenge.content || '<p>No challenge content available.</p>' }}
        />
      </div>
    </aside>
  );
}
