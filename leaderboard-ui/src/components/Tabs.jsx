export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-lime-300 text-black shadow-[0_0_25px_rgba(190,242,100,0.35)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
