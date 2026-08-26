export function LiveScoreCard() {
  return (
    <div className="card w-full max-w-sm p-5 shadow-glow animate-fade-up" style={{ animationDelay: "180ms" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-volt-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-volt-400" />
          </span>
          LIVE · Group A
        </span>
        <span className="text-xs text-black/40">62&apos;</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Coastal FC</span>
          <span className="font-mono text-lg font-semibold">2</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Riverside SC</span>
          <span className="font-mono text-lg font-semibold">1</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between text-xs text-black/40">
        <span>Field 2 · Coastal Cup</span>
        <span className="text-pitch-600 font-semibold">Standings updated</span>
      </div>
    </div>
  );
}
