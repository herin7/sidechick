import { useState } from 'react';
import GlobalLeaderboard from './components/GlobalLeaderboard';
import { EmptyState, ErrorState } from './components/PanelState';
import SkeletonTable from './components/SkeletonTable';
import Tabs from './components/Tabs';
import TeamLeaderboard from './components/TeamLeaderboard';
import { useLeaderboard } from './hooks/useLeaderboard';

const tabs = [
  { id: 'global', label: 'Global Top Coders' },
  { id: 'teams', label: 'Top Teams' }
];

const copy = {
  global: {
    title: 'Global Top Coders',
    subtitle: 'Live rank by momentum first, total solves second.'
  },
  teams: {
    title: 'Top Teams',
    subtitle: 'The squads shipping streaks and piling up accepted solves.'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('global');
  const globalQuery = useLeaderboard('/api/leaderboard/global');
  const teamsQuery = useLeaderboard('/api/leaderboard/teams');
  const activeQuery = activeTab === 'global' ? globalQuery : teamsQuery;
  const activeCopy = copy[activeTab];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(163,230,53,0.12),_transparent_28%),linear-gradient(180deg,_#111111_0%,_#050505_55%,_#000000_100%)] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black/50 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/60 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-lime-300">SideChick Leaderboard</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Developer-first rankings with sharp contrast and zero fluff.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                Watch the hottest coders and strongest teams climb the board in real time from the SideChick backend.
              </p>
            </div>

            <div className="flex justify-start lg:justify-end">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[36px] border border-white/10 bg-white/[0.02] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">{activeCopy.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{activeCopy.subtitle}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
              Live from Neon
            </div>
          </div>

          {activeQuery.isLoading ? <SkeletonTable /> : null}

          {!activeQuery.isLoading && activeQuery.error ? (
            <ErrorState message={activeQuery.error} />
          ) : null}

          {!activeQuery.isLoading && !activeQuery.error && activeQuery.data.length === 0 ? (
            <EmptyState
              title="Nothing Yet"
              message="No ranking data has been published yet. Once scores land, the board will light up."
            />
          ) : null}

          {!activeQuery.isLoading && !activeQuery.error && activeQuery.data.length > 0 && activeTab === 'global' ? (
            <GlobalLeaderboard rows={activeQuery.data} />
          ) : null}

          {!activeQuery.isLoading && !activeQuery.error && activeQuery.data.length > 0 && activeTab === 'teams' ? (
            <TeamLeaderboard rows={activeQuery.data} />
          ) : null}
        </section>
      </div>
    </main>
  );
}
