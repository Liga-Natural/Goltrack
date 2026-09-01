import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments, TournamentStaff } from "@/lib/models";
import { TournamentHeader } from "@/components/TournamentHeader";

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tournament = await Tournaments.byId(params.id);
  // Who may open this event's dashboard. Mirrors requireOwnedTournament in
  // lib/actions.ts deliberately — if the page let someone in that the actions
  // refuse (or the reverse), one of the two is lying to the user. Assigned
  // staff are the third case: without it an invited director can be given a
  // tournament and still get a 404 on it.
  if (!tournament) notFound();
  const permitted =
    tournament.ownerId === user.id ||
    user.role === "ADMIN" ||
    (await TournamentStaff.isAssigned(tournament.id, user.id));
  if (!permitted) notFound();

  return (
    <div>
      <TournamentHeader tournament={tournament} />
      {children}
    </div>
  );
}
