import type { Sponsor } from "@/lib/models";

/**
 * The sponsor strip. Renders nothing at all when the module is off or nobody
 * is live — an empty "Our sponsors" heading over blank space is worse than
 * no section, and it is what a spectator sees on most events.
 */
export function SponsorBanner({ sponsors, compact = false }: { sponsors: Sponsor[]; compact?: boolean }) {
  const live = sponsors.filter((s) => s.active === 1);
  if (live.length === 0) return null;

  return (
    <section className={compact ? "" : "card p-5 sm:p-6"}>
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-3">
        {compact ? "Supported by" : "Supported by local businesses"}
      </p>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {live.map((s) => {
          const body = (
            <>
              {s.logoMimeType ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/sponsors/${s.id}/logo`} alt="" className="h-10 w-10 rounded-xl object-contain bg-surface p-1 shrink-0" />
              ) : (
                <span className="h-10 w-10 rounded-xl bg-surface flex items-center justify-center text-[11px] font-bold text-ink2 shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-inkDisplay truncate">{s.name}</span>
                {s.tagline && <span className="block text-[11px] text-ink3 truncate">{s.tagline}</span>}
                {s.promoCode && (
                  <span className="badge badge-pending text-[10px] mt-1.5 inline-block">
                    {s.promoCode}
                    {s.promoDetail ? ` · ${s.promoDetail}` : ""}
                  </span>
                )}
              </span>
            </>
          );
          const className = "flex items-start gap-3 rounded-2xl bg-surface2 p-3.5 clay-tile";
          // rel="noopener nofollow": these are paid placements pointing at
          // sites this app does not vouch for.
          return s.url ? (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className={className}>
              {body}
            </a>
          ) : (
            <div key={s.id} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
