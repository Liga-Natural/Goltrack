import Link from "next/link";
import type { Tournament } from "@/lib/models";

/**
 * Which event these settings apply to. Rendered as links rather than a select
 * so the choice is in the URL — an organizer configuring two events wants to
 * keep both tabs open, and a settings screen that forgets which event it is
 * on is how the wrong tournament gets edited.
 */
export function TournamentPicker({
  tournaments,
  selectedId,
  basePath,
}: {
  tournaments: Tournament[];
  selectedId: string;
  basePath: string;
}) {
  if (tournaments.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5">
      {tournaments.map((t) => (
        <Link
          key={t.id}
          href={`${basePath}?t=${t.id}`}
          className={`shrink-0 whitespace-nowrap text-xs px-4 py-2 rounded-full transition-[box-shadow,color] ${
            t.id === selectedId
              ? "clay-pill-active bg-pitch-400/15 text-inkDisplay font-semibold"
              : "bg-surface2 text-ink2 hover:text-inkDisplay clay-pill-raised"
          }`}
        >
          {t.name}
        </Link>
      ))}
    </div>
  );
}
