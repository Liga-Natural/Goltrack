import { formatMetric } from "@/lib/playerStats";
import type { RadarPoint } from "@/lib/playerStats";

// A radar's honest failure mode is that the area it draws depends on the order
// of its axes — reorder them and the same player looks better or worse. Two
// things keep this one readable:
//
//  1. The axis order is fixed by METRICS in lib/playerStats.ts and never sorted
//     per player, so two players' shapes are comparable to each other.
//  2. Every raw measurement is printed beside the chart. A radar alone cannot
//     tell you a sprint was 5.12s, and a parent reading "how fast is my kid"
//     needs the number, not a polygon.
//
// One series, so there is no categorical palette and no legend: the heading
// names the player. Grid and axes stay recessive; text wears ink tokens rather
// than the series colour.

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointAt(index: number, count: number, ratio: number) {
  // Start at 12 o'clock and go clockwise, which is how these read as a shape.
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ratio,
    y: CENTER + Math.sin(angle) * RADIUS * ratio,
  };
}

export function PlayerRadar({ points, cohortSize }: { points: RadarPoint[]; cohortSize: number }) {
  const scored = points.filter((p) => p.score != null);
  const canPlot = scored.length >= 3;

  const polygon = points
    .map((p, i) => {
      const { x, y } = pointAt(i, points.length, Math.max(0.04, (p.score ?? 0) / 100));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
      <div className="mx-auto">
        {canPlot ? (
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Athletic profile">
            {RINGS.map((r) => (
              <polygon
                key={r}
                points={points.map((_, i) => {
                  const { x, y } = pointAt(i, points.length, r);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(" ")}
                fill="none"
                stroke="rgb(var(--ink) / 0.10)"
                strokeWidth="1"
              />
            ))}
            {points.map((_, i) => {
              const { x, y } = pointAt(i, points.length, 1);
              return (
                <line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="rgb(var(--ink) / 0.10)"
                  strokeWidth="1"
                />
              );
            })}
            <polygon
              points={polygon}
              fill="rgb(var(--pitch-400) / 0.22)"
              stroke="rgb(var(--pitch-400))"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {points.map((p, i) => {
              const { x, y } = pointAt(i, points.length, Math.max(0.04, (p.score ?? 0) / 100));
              return (
                <circle
                  key={p.key}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="rgb(var(--pitch-400))"
                  stroke="rgb(var(--paper))"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
        ) : (
          <div
            className="flex items-center justify-center rounded-xl border border-dashed border-line text-center p-6"
            style={{ width: SIZE, height: SIZE }}
          >
            <p className="text-xs text-ink3 max-w-[14rem]">
              A radar needs a squad to compare against. Once at least two players on this team have been tested, this
              fills in.
            </p>
          </div>
        )}
      </div>

      {/* The table view. Raw measurement first, because that is the fact; the
          cohort score second, because that is an interpretation of it. */}
      <dl className="space-y-2.5 min-w-0">
        {points.map((p) => (
          <div key={p.key}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-ink2 truncate">{p.label}</dt>
              <dd className="font-score text-sm text-inkDisplay shrink-0">{formatMetric(p.raw, p.unit)}</dd>
            </div>
            <div className="h-1 rounded-full bg-black/10 overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-pitch-400"
                style={{ width: `${p.score ?? 0}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-ink3 pt-1">
          {cohortSize >= 2
            ? `Scored against the ${cohortSize} players on this squad who have been tested — not against published age-group norms, which Jogo does not have.`
            : "Scores appear once more of the squad has been tested; the measurements above are exact."}
        </p>
      </dl>
    </div>
  );
}
