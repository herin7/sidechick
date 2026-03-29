function SkeletonRow() {
  return (
    <div className="grid grid-cols-[64px_1fr_120px_120px] gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="h-5 animate-pulse rounded bg-white/8" />
      <div className="h-5 animate-pulse rounded bg-white/8" />
      <div className="h-5 animate-pulse rounded bg-white/8" />
      <div className="h-5 animate-pulse rounded bg-white/8" />
    </div>
  );
}

export default function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  );
}
