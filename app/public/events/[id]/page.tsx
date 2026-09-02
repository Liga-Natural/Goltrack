import { notFound, redirect } from "next/navigation";
import { Tournaments } from "@/lib/models";

// The spectator portal lives at /t/[slug] — one public page, one URL that
// gets shared and indexed. This route exists because it is the address people
// were given, and it resolves an event id to that canonical page rather than
// standing up a second copy of the same screen to keep in sync.
export default async function PublicEventAliasPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id)) ?? (await Tournaments.bySlug(params.id));
  if (!tournament) notFound();
  redirect(`/t/${tournament.slug}`);
}
