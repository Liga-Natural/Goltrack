import { Applications, ApplicationMessages, Tournaments, Teams } from "@/lib/models";
import { ApplicationsWorkspace } from "@/components/ApplicationsWorkspace";
import { groupLetters } from "@/lib/groups";

function parseDivisions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

export default async function ApplicationsPage({ params }: { params: { id: string } }) {
  const [applications, messages, tournament, teams] = await Promise.all([
    Applications.listByTournament(params.id),
    ApplicationMessages.listByTournament(params.id),
    Tournaments.byId(params.id),
    Teams.listByTournament(params.id),
  ]);

  // Only a grouped competition has brackets to place into; a league table or
  // a straight knockout has none, and the modal hides the control entirely
  // rather than offering a choice that would be discarded.
  const groups = tournament?.format === "GROUPS_KNOCKOUT" ? groupLetters(tournament.groupsCount) : [];
  const teamGroupById = Object.fromEntries(teams.map((t) => [t.id, t.groupName]));

  return (
    <ApplicationsWorkspace
      tournamentId={params.id}
      applications={applications}
      messages={messages}
      divisions={parseDivisions(tournament?.divisions ?? null)}
      groups={groups}
      teamGroupById={teamGroupById}
    />
  );
}
