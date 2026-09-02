"use client";

import { useState } from "react";

export interface GalleryItem {
  id: string;
  caption: string | null;
  credit: string | null;
  teamId: string | null;
  division: string | null;
  featured: boolean;
}

/** Approved photos, filterable by team. Featured ones lead. */
export function MediaGallery({
  items,
  teams,
  initialTeam,
}: {
  items: GalleryItem[];
  teams: { id: string; name: string }[];
  initialTeam: string;
}) {
  const [team, setTeam] = useState(initialTeam);
  const visible = team ? items.filter((i) => i.teamId === team) : items;
  // Only offer a badge for a team that actually has photos — a filter bar of
  // twelve clubs where eleven return nothing is a worse list than no bar.
  const withPhotos = teams.filter((t) => items.some((i) => i.teamId === t.id));

  const pill = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-xs px-4 py-2 rounded-full transition-[box-shadow,color] ${
      active ? "clay-pill-active bg-pitch-400/15 text-inkDisplay font-semibold" : "bg-surface2 text-ink2 clay-pill-raised"
    }`;

  if (items.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-ink2">No approved photos yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {withPhotos.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setTeam("")} className={pill(team === "")}>
            All teams
          </button>
          {withPhotos.map((t) => (
            <button key={t.id} type="button" onClick={() => setTeam(t.id)} className={pill(team === t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((item) => (
          <figure key={item.id} className="rounded-2xl bg-surface2 overflow-hidden clay-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${item.id}/image`} alt={item.caption ?? ""} className="w-full h-48 object-cover" 
          loading="lazy"
          decoding="async"
        />
            <figcaption className="p-3.5">
              {item.featured && <span className="badge badge-pending text-[10px] mb-1.5 inline-block">FEATURED</span>}
              <p className="text-sm text-inkDisplay line-clamp-2">{item.caption || "Untitled"}</p>
              {item.credit && <p className="text-[11px] text-ink3 mt-0.5">{item.credit}</p>}
            </figcaption>
          </figure>
        ))}
      </div>

      {visible.length === 0 && <p className="text-sm text-ink2 py-8 text-center">No photos for that team yet.</p>}
    </div>
  );
}
