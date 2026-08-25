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
  const tournament = Tournaments.byId(params.id);
  if (!tournament || tournament.ownerId !== user.id) notFound();

  return (
    <div>
      <TournamentHeader tournament={tournament} />
      {children}
    </div>
  );
}
