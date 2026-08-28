import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Tournaments } from "@/lib/models";
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
  // ADMIN can open any tournament, same as any organizer's own — everyone
  // else only theirs.
  if (!tournament || (tournament.ownerId !== user.id && user.role !== "ADMIN")) notFound();

  return (
    <div>
      <TournamentHeader tournament={tournament} />
      {children}
    </div>
  );
}
