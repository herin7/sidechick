function FireIcon() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-400/30 bg-orange-500/10 shadow-[0_0_18px_rgba(251,146,60,0.45)]">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-orange-300"
        aria-hidden="true"
      >
        <path d="M13.4 2.2c.4 2.1-.4 3.6-1.5 5-.9 1.2-1.8 2.2-1.6 3.8.2 1.3 1.3 2.2 2.8 2.2 2 0 3.2-1.5 3.2-3.5 0-1.7-.8-3.4-1.9-4.8 3.4 1.7 5.6 5 5.6 8.8 0 4.8-3.6 8.3-8.5 8.3S3 18.5 3 13.7c0-3.9 2.2-7.3 5.5-9 .1 1.2.6 2.2 1.5 3.1.6-.9 1.1-1.8 1.3-2.9.3-1.2.2-2-.1-2.9.8.2 1.7.8 2.2 1.2Z" />
      </svg>
    </span>
  );
}

export default function GlobalLeaderboard({ rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/35">
      <div className="grid grid-cols-[64px_1fr_120px_120px] gap-4 border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.24em] text-zinc-500">
        <span>Rank</span>
        <span>Coder</span>
        <span>Streak</span>
        <span>Solved</span>
      </div>

      <div className="divide-y divide-white/6">
        {rows.map((row, index) => (
          <div
            key={`${row.handle}-${index}`}
            className="grid grid-cols-[64px_1fr_120px_120px] gap-4 px-4 py-4 transition hover:bg-white/[0.03]"
          >
            <span className="text-sm font-semibold text-zinc-500">#{index + 1}</span>
            <div className="flex items-center gap-3">
              <span className="font-medium text-white">{row.handle}</span>
              {row.streak > 5 ? <FireIcon /> : null}
            </div>
            <span className="text-zinc-200">{row.streak}</span>
            <span className="font-semibold text-lime-300">{row.total_solved}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
