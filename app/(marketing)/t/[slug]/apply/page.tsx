import { notFound } from "next/navigation";
import Link from "next/link";
import { Tournaments, Teams } from "@/lib/models";
import { submitApplication } from "@/lib/actions";
import { Logo } from "@/components/Logo";
import { getSportTheme } from "@/lib/sportTheme";
import { formatLabel } from "@/lib/formatLabel";
import { CrestDropZone } from "@/components/CrestDropZone";
import { ManagerGate } from "@/components/ManagerGate";
import { getCurrentUser } from "@/lib/auth";
import { tierClass } from "@/lib/tierStyles";

// Session-dependent: the page shows the gate or the form depending on who
// is signed in, so it cannot be cached across visitors.
export const dynamic = "force-dynamic";

function parseDivisions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d) => typeof d === "string") : [];
  } catch {
    return [];
  }
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { submitted?: string; phone?: string };
}) {
  const tournament = await Tournaments.bySlug(params.slug);
  if (!tournament) notFound();
  const user = await getCurrentUser();

  const theme = getSportTheme(tournament.sport);
  const divisions = parseDivisions(tournament.divisions);
  const teams = (await Teams.listByTournament(tournament.id)).filter((t) => t.name);
  const submit = submitApplication.bind(null, params.slug);
  const fee = (tournament.feeCents / 100).toFixed(0);
  // Age groups and tiers are split back out of the composed division names
  // the organizer configured ("U12 Premier" -> "U12" + "Premier"), falling
  // back to the full ranges when a tournament predates divisions.
  const ALL_AGES = ["U8","U9","U10","U11","U12","U13","U14","U15","U16","U17","U18","U19"];
  const ALL_TIERS = ["Premier", "Gold", "Silver", "Bronze"];
  const configuredAges = Array.from(new Set(divisions.map((d) => d.split(" ")[0]).filter(Boolean)));
  const configuredTiers = Array.from(new Set(divisions.map((d) => d.split(" ").slice(1).join(" ")).filter(Boolean)));
  const ageOptions = configuredAges.length ? configuredAges : ALL_AGES;
  const tierOptions = configuredTiers.length ? configuredTiers : ALL_TIERS;

  const dates = `${new Date(tournament.startDate).toLocaleDateString()} – ${new Date(tournament.endDate).toLocaleDateString()}`;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href={`/t/${tournament.slug}`}>
            <Logo />
          </Link>
          <Link href={`/t/${tournament.slug}`} className="btn-ghost text-sm">
            Tournament page →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        {searchParams.submitted ? (
          // Terminal confirmation rather than a toast on the form: an
          // applicant needs to know the thing was received and that a human
          // decides next, otherwise they submit again.
          <div className="card p-8 sm:p-10 text-center">
            <p className="text-4xl mb-4" aria-hidden="true">✅</p>
            <h1 className="text-2xl font-extrabold text-inkDisplay mb-2">Application received</h1>
            <p className="text-sm text-ink2 max-w-md mx-auto mb-6">
              {tournament.supervisorName} will review your entry for {tournament.name} and confirm your place. You&apos;ll
              be contacted at the email you provided.
            </p>
            <Link href={`/t/${tournament.slug}`} className="btn-primary text-sm">
              View the tournament
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-2">Team registration</p>
              <h1 className="text-display-sm mb-3">{tournament.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${theme.soft}`}>
                  {theme.emoji} {theme.label} {tournament.teamFormat}
                </span>
                <span className="badge">{formatLabel(tournament.format)}</span>
              </div>
            </div>

            <div className="card p-5 sm:p-6 mb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <Fact label="Dates" value={dates} />
                <Fact label="Venue" value={tournament.location || "TBC"} />
                <Fact label="Entry fee" value={`$${fee} per team`} />
                <Fact label="Teams entered" value={String(teams.length)} />
              </div>
              {divisions.length > 0 && (
                <div className="mt-5 pt-5 border-t border-lineSoft">
                  <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-2">Divisions open</p>
                  <div className="flex flex-wrap gap-1.5">
                    {divisions.map((d) => (
                      <span key={d} className={`badge text-[11px] ${tierClass(d)}`}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Read-only. Payment is settled after acceptance, so the form
                states the number and collects nothing about how it is paid. */}
            <div className="card p-5 sm:p-6 mb-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1">Entry fee</p>
                <p className="text-sm text-ink2">Payment terms are agreed once your team is accepted.</p>
              </div>
              <p className="font-score text-3xl text-inkDisplay leading-none shrink-0">
                ${fee}
                <span className="text-xs text-ink3 font-body font-medium ml-1">/ team</span>
              </p>
            </div>

            {!user ? (
              // Unauthenticated visitors see the whole event — dates, venue,
              // fee, divisions — and are only stopped at the point where they
              // would submit. Gating the details themselves would make the
              // shareable link useless for the thing it is shared for.
              <div className="card mesh p-8 sm:p-10 text-center">
                <h2 className="text-2xl font-extrabold text-inkDisplay mb-2">Register your team</h2>
                <p className="text-sm text-ink2 max-w-md mx-auto mb-6">
                  Create a manager account or log in to enter {tournament.name}. Your application, roster and
                  match-day passports all live in that account.
                </p>
                <ManagerGate slug={params.slug} />
              </div>
            ) : (
            <form action={submit} className="card p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Team</h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="teamName">Team name</label>
                      <input id="teamName" className="input" name="teamName" required placeholder="Riverside Rovers U14" />
                    </div>
                    <div>
                      <label className="label" htmlFor="clubName">Club (optional)</label>
                      <input id="clubName" className="input" name="clubName" placeholder="Riverside SC" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="ageGroup">Age group</label>
                      <select id="ageGroup" className="input" name="ageGroup" defaultValue={ageOptions[0]}>
                        {ageOptions.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="rosterCount">Estimated squad size</label>
                      <input id="rosterCount" className="input" type="number" min={0} name="rosterCount" defaultValue={14} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Competition tier</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {tierOptions.map((t, i) => (
                        <label
                          key={t}
                          className="flex items-center gap-2 rounded-xl border border-line p-3 cursor-pointer hover:bg-black/[0.03] transition-colors has-[:checked]:border-black/30 has-[:checked]:bg-black/[0.06]"
                        >
                          <input type="radio" name="tier" value={t} defaultChecked={i === 0} />
                          <span className="text-sm font-semibold">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-ink3">
                    Player names and roster uploads unlock in your account portal upon official team acceptance.
                  </p>
                </div>
              </div>

              <div className="border-t border-lineSoft pt-8">
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Manager contact</h2>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="managerName">Full name</label>
                      <input id="managerName" className="input" name="managerName" required defaultValue={user?.name || ""} placeholder="Jordan Reyes" />
                    </div>
                    <div>
                      <label className="label" htmlFor="managerEmail">Email</label>
                      <input id="managerEmail" className="input" type="email" name="managerEmail" required defaultValue={user?.email || ""} placeholder="coach@club.com" />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="managerPhone">Phone (optional)</label>
                    <input id="managerPhone" className="input" name="managerPhone" defaultValue={searchParams.phone || ""} placeholder="(305) 555-0100" />
                  </div>
                </div>
              </div>

              <div className="border-t border-lineSoft pt-8">
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">Club crest</h2>
                <CrestDropZone />
                <div className="mt-6">
                  <label className="label" htmlFor="notes">Notes for the organizer (optional)</label>
                  <textarea id="notes" className="input min-h-[5rem] py-3" name="notes" placeholder="Scheduling constraints, travelling squad, anything else." />
                </div>
              </div>

              <button className="btn-primary w-full text-base py-3">Submit application</button>
              <p className="text-xs text-ink3 text-center -mt-4">
                Submitting doesn&apos;t confirm a place — {tournament.supervisorName} reviews every entry.
              </p>
            </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
