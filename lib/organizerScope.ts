import { Tournaments, TournamentStaff } from "@/lib/models";
import type { Tournament, User } from "@/lib/models";

// Which events an account may configure, and which one a settings screen is
// currently pointed at. Every /organizer/* page needs the same two answers,
// and having them in one place is what stops one screen from being stricter
// than another about the same tournament.

export async function organizerTournaments(user: User): Promise<Tournament[]> {
  const owned = await Tournaments.listByOwner(user.id);
  const assignedIds = await TournamentStaff.listTournamentIdsForUser(user.id);
  const all = user.role === "ADMIN" ? await Tournaments.listAll() : [];
  const byId = new Map([...all, ...owned].map((t) => [t.id, t]));
  for (const id of assignedIds) {
    if (!byId.has(id)) {
      const t = await Tournaments.byId(id);
      if (t) byId.set(t.id, t);
    }
  }
  return [...byId.values()];
}

/**
 * The event a screen is working on: the one named in ?t=, or the first the
 * account can reach. Returns undefined only when they can reach none, which
 * the pages render as an empty state rather than a redirect — an organizer
 * with no events is not lost, they just have not made one yet.
 */
export function selectedTournament(tournaments: Tournament[], requestedId?: string): Tournament | undefined {
  if (requestedId) {
    const match = tournaments.find((t) => t.id === requestedId);
    if (match) return match;
  }
  return tournaments[0];
}
