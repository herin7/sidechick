export default function TeamLeaderboard({ rows }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/35">
      <div className="grid grid-cols-[64px_1.4fr_160px_140px] gap-4 border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.24em] text-zinc-500">
        <span>Rank</span>
        <span>Team</span>
        <span>Total Solves</span>
        <span>Avg Streak</span>
      </div>

      <div className="divide-y divide-white/6">
        {rows.map((row, index) => (
          <div
            key={`${row.team_id || row.name}-${index}`}
            className="grid grid-cols-[64px_1.4fr_160px_140px] gap-4 px-4 py-4 transition hover:bg-white/[0.03]"
          >
            <span className="text-sm font-semibold text-zinc-500">#{index + 1}</span>
            <span className="font-medium text-white">{row.name}</span>
            <span className="font-semibold text-lime-300">{row.total_team_solves}</span>
            <span className="text-zinc-200">{row.avg_streak}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
