export function ErrorState({ message }) {
  return (
    <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/8 px-6 py-8 text-rose-100">
      <p className="text-sm uppercase tracking-[0.22em] text-rose-300">Request Failed</p>
      <p className="mt-3 text-base text-rose-100/90">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-8">
      <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">{title}</p>
      <p className="mt-3 text-base text-zinc-200">{message}</p>
    </div>
  );
}
