import { PIN_KINDS, parsePins, directionsUrl, appleMapsUrl } from "@/lib/modules";

/**
 * The complex, as the organizer drew it. Not a real map — Jogo has no site
 * plan for anyone's fields — so it is a labelled diagram plus the two links
 * that do work: Apple and Google directions to the address they typed.
 */
export function VenueMap({ pins, address }: { pins: string | null; address: string | null }) {
  const placed = parsePins(pins);
  const google = directionsUrl(address);
  const apple = appleMapsUrl(address);
  if (placed.length === 0 && !google) return null;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Getting around</h2>
        <div className="flex items-center gap-2">
          {apple && (
            <a href={apple} target="_blank" rel="noreferrer" className="badge bg-neutralBadge text-ink2 text-[10px]">
              Apple Maps →
            </a>
          )}
          {google && (
            <a href={google} target="_blank" rel="noreferrer" className="badge bg-neutralBadge text-ink2 text-[10px]">
              Google Maps →
            </a>
          )}
        </div>
      </div>

      {placed.length > 0 ? (
        <>
          <div className="relative rounded-3xl bg-surface2 h-64 sm:h-80 overflow-hidden" style={{ boxShadow: "var(--clay-field)" }}>
            {placed.map((pin, i) => (
              <span
                key={`${pin.label}-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-inkDisplay clay-pill-raised"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                {PIN_KINDS.find((k) => k.value === pin.kind)?.glyph} {pin.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-ink3 mt-2">
            A layout the organizer arranged for this venue, not a survey — use it to find the right corner of the
            complex, and the directions links above to get there.
          </p>
        </>
      ) : (
        <p className="text-sm text-ink2">{address}</p>
      )}
    </section>
  );
}
