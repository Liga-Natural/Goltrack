import type { Application, Team } from "@/lib/models";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Cumulative entrants per day, from the application timestamps that already
// exist. A real series rather than a decorative squiggle — the line only
// climbs when a team actually came in, so a flat stretch means a quiet week
// and is worth seeing.
function registrationSeries(applications: Application[], points = 12): number[] {
  const accepted = applications
    .filter((a) => a.status === "ACCEPTED")
    .map((a) => new Date(a.decidedAt || a.createdAt).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (accepted.length === 0) return [];

  const first = accepted[0];
  const last = accepted[accepted.length - 1];
  const span = Math.max(last - first, 1);
  return Array.from({ length: points }, (_, i) => {
    const cutoff = first + (span * (i + 1)) / points;
    return accepted.filter((t) => t <= cutoff).length;
  });
}

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return <div className="h-10 mt-3" />;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pt = (v: number, i: number) =>
    `${(i / (series.length - 1)) * 100},${36 - ((v - min) / span) * 30 - 3}`;
  const line = series.map(pt).join(" ");
  // The filled area is what makes a 40px-tall line legible at a glance; the
  // stroke alone reads as a hairline on a dark panel.
  const area = `0,36 ${line} 100,36`;

  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full h-10 mt-3" aria-hidden="true">
      <defs>
        <linearGradient id="kpi-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--pitch-400))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--pitch-400))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#kpi-spark)" />
      <polyline
        points={line}
        fill="none"
        stroke="rgb(var(--pitch-400))"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: "brand" | "soft" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-ink2 font-semibold truncate">{label}</span>
        <span className="font-score text-inkDisplay">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            tone === "brand" ? "bg-pitch-400" : "bg-black/30"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

export function KpiRow({
  teams,
  applications,
  feeCents,
}: {
  teams: Team[];
  applications: Application[];
  feeCents: number;
}) {
  const entered = teams.length;
  const applied = applications.length;
  const acceptedApps = applications.filter((a) => a.status === "ACCEPTED").length;
  const pendingApps = applications.filter((a) => a.status === "PENDING").length;

  // Teams can exist without an application — invited directly, or seeded
  // before the application flow existed — so entrants and applicants are not
  // two views of one number. Comparing them produced "275% accepted". The
  // acceptance rate is accepted-out-of-applied, both from the same table;
  // the registrations tile shows the entrant count on its own, with pending
  // applications called out beside it rather than folded into a ratio.

  const paid = teams.filter((t) => t.paid).length;
  const invoiced = entered * feeCents;
  const collected = paid * feeCents;
  const outstanding = invoiced - collected;
  const owing = entered - paid;

  const collectedPct = invoiced ? Math.round((collected / invoiced) * 100) : 0;
  const acceptedPct = applied ? Math.round((acceptedApps / applied) * 100) : 0;

  const series = registrationSeries(applications);

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="card p-5 overflow-hidden">
        <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">Total registrations</p>
        <div className="flex items-baseline gap-2">
          <p className="font-score text-3xl text-inkDisplay leading-none">
            {entered}
            <span className="text-ink3 text-xl"> team{entered === 1 ? "" : "s"}</span>
          </p>
          {pendingApps > 0 && (
            <span className="badge badge-pending text-[10px] ml-auto shrink-0">{pendingApps} in review</span>
          )}
        </div>
        <Sparkline series={series} />
      </div>

      <div className="card p-5">
        <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1.5">Outstanding fees</p>
        <p className="font-score text-3xl text-inkDisplay leading-none">{money(outstanding)}</p>
        <div className="mt-3">
          {owing > 0 ? (
            <span className="badge badge-danger text-[10px]">
              {owing} team{owing === 1 ? "" : "s"} owing
            </span>
          ) : (
            <span className="badge badge-accepted text-[10px]">All settled</span>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-3">Total collected</p>
        <div className="space-y-3">
          <Bar label="Fees collected" pct={collectedPct} tone="brand" />
          {applied > 0 && <Bar label="Applicants accepted" pct={acceptedPct} tone="soft" />}
        </div>
        <p className="text-[11px] text-ink3 mt-3">
          {money(collected)} of {money(invoiced)}
        </p>
      </div>
    </div>
  );
}
