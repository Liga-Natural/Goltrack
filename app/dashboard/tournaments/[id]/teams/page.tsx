import { Tournaments, Teams, Players } from "@/lib/models";
import { addTeam, addPlayer, removeTeam, setTeamPaid, createTeamInvite, uploadTeamCrest } from "@/lib/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { TeamBadge } from "@/components/TeamBadge";

export default async function TeamsPage({ params }: { params: { id: string } }) {
  const tournament = (await Tournaments.byId(params.id))!;
  const allTeams = await Teams.listByTournament(tournament.id);
  const teams = allTeams.filter((t) => t.name);
  const pendingInvites = allTeams.filter((t) => !t.name && t.inviteToken);
  const addTeamWithId = addTeam.bind(null, tournament.id);
  const createInviteWithId = createTeamInvite.bind(null, tournament.id);
  // Pre-fetched per team before rendering — a render callback can't await,
  // and ensureLogoToken backfills a token for teams created before the
  // crest feature shipped, so it has to run once here rather than lazily
  // inside JSX.
  const teamsWithDetails = await Promise.all(
    teams.map(async (team) => ({
      team,
      players: await Players.listByTeam(team.id),
      logoToken: team.logoToken || (await Teams.ensureLogoToken(team.id)),
    }))
  );

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* min-w-0: a grid item's default min-width:auto refuses to shrink
            below its content's min-content size — with long unbroken crest-
            link tokens and player names inside, that dragged this whole
            column (and the page) wider than the viewport on mobile instead
            of letting the truncate/wrap rules further down actually kick
            in. Same fix, same root cause, as StandingsTable's own
            min-w-0 note. */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {teams.length === 0 && pendingInvites.length === 0 && (
            <p className="text-black/50">No teams yet — add one, generate an invite link, or share the registration link.</p>
          )}
          {teamsWithDetails.map(({ team, players, logoToken }) => {
            const addPlayerWithIds = addPlayer.bind(null, tournament.id, team.id);
            const removeTeamWithIds = removeTeam.bind(null, tournament.id, team.id);
            const setPaidTrue = setTeamPaid.bind(null, tournament.id, team.id, true);
            const setPaidFalse = setTeamPaid.bind(null, tournament.id, team.id, false);
            const uploadCrestWithIds = uploadTeamCrest.bind(null, tournament.id, team.id);
            return (
              <div key={team.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamBadge id={team.id} name={team.name} hasCrest={team.hasCrest} crestUpdatedAt={team.crestUpdatedAt} logoUrl={team.logoUrl} sport={tournament.sport} />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {team.name} {team.groupName && <span className="text-black/40 font-normal text-sm">· Group {team.groupName}</span>}
                      </h3>
                      <p className="text-sm text-black/40 truncate">{team.contactName} · {team.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={team.paid ? setPaidFalse : setPaidTrue}>
                      <button className={`badge ${team.paid ? "bg-volt-400/15 text-volt-500" : "bg-neutralBadge text-ink2"}`}>
                        {team.paid ? "Paid ✓" : "Unpaid"}
                      </button>
                    </form>
                    <form action={removeTeamWithIds}>
                      <button className="text-xs text-black/30 hover:text-red-600">Remove</button>
                    </form>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3 bg-black/[0.03] rounded-lg px-3 py-2">
                  <form action={uploadCrestWithIds} className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <input
                      className="text-xs flex-1 min-w-0 file:mr-2 file:btn-secondary file:text-xs file:px-2.5 file:py-1 file:border-0 file:cursor-pointer"
                      type="file"
                      name="crest"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      required
                    />
                    <button className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
                      {team.hasCrest ? "Replace crest" : "Upload crest"}
                    </button>
                  </form>
                  <div className="flex items-center gap-1.5 min-w-0 w-full sm:w-auto">
                    <code className="text-xs text-pitch-600 truncate min-w-0">…/crest/{logoToken}</code>
                    <CopyLinkButton path={`/t/${tournament.slug}/crest/${logoToken}`} />
                  </div>
                </div>
                <p className="text-xs text-black/30 -mt-2 mb-3">
                  Send the crest link above to {team.contactName || "the team"}&apos;s manager to let them upload their own logo — no account needed.
                </p>

                <div className="space-y-1.5 mb-3">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-sm text-black/60 border-b border-black/5 pb-1">
                      <span className="truncate min-w-0">
                        {p.jerseyNumber && <span className="text-black/30 mr-2">#{p.jerseyNumber}</span>}
                        {p.name}
                      </span>
                      <a
                        href={`/passport/${p.id}`}
                        target="_blank"
                        className="text-black/30 hover:text-pitch-600 text-xs underline decoration-dotted shrink-0"
                      >
                        passport →
                      </a>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-xs text-black/30">No players added yet.</p>}
                </div>

                <form action={addPlayerWithIds} className="flex gap-2">
                  <input className="input flex-1" name="name" placeholder="Player name" required />
                  <input className="input w-20" name="jerseyNumber" placeholder="#" />
                  <button className="btn-secondary text-sm px-3">Add</button>
                </form>
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          {/* lg:sticky, not sticky — this is only a side column once
              lg:grid-cols-3 kicks in; on mobile it's a normal-flow card
              below the team list, and an unconditional sticky pinned it
              mid-scroll on top of the page's own sticky header. */}
          <div className="card p-5 lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">Invite links</h3>
              <form action={createInviteWithId}>
                <button className="btn-secondary text-xs px-2.5 py-1.5">+ Generate</button>
              </form>
            </div>
            <p className="text-xs text-black/40 mb-3">
              Each link is unique to one team and works once — like a gotsport-style invite. Send one per team you
              want to reserve a spot.
            </p>
            {pendingInvites.length === 0 ? (
              <p className="text-xs text-black/30">No pending invites.</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-2 bg-black/[0.05] rounded-lg px-2.5 py-2">
                    <code className="text-xs text-pitch-600 truncate min-w-0">…/invite/{invite.inviteToken}</code>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CopyLinkButton path={`/t/${tournament.slug}/invite/${invite.inviteToken}`} />
                      <form action={removeTeam.bind(null, tournament.id, invite.id)}>
                        <button className="text-xs text-black/30 hover:text-red-600 px-1">✕</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-3">Add a team manually</h3>
            <form action={addTeamWithId} className="space-y-3">
              <div>
                <label className="label">Team name</label>
                <input className="input" name="name" required />
              </div>
              <div>
                <label className="label">Contact name</label>
                <input className="input" name="contactName" required />
              </div>
              <div>
                <label className="label">Contact email</label>
                <input className="input" type="email" name="contactEmail" required />
              </div>
              <p className="text-xs text-black/30">
                Crest upload happens after the team is created — use the &quot;Upload crest&quot; control on the team&apos;s card.
              </p>
              <button className="btn-primary w-full">Add team</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
