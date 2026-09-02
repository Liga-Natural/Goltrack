import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { organizerTournaments, selectedTournament } from "@/lib/organizerScope";
import { moduleSettings, saveModuleSettings, saveSponsor, deleteSponsor } from "@/lib/actions";
import { TournamentPicker } from "@/components/TournamentPicker";
import { Sponsors } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function SponsorsPage({ searchParams }: { searchParams: { t?: string; edit?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/sponsors");
  const tournaments = await organizerTournaments(user);
  const tournament = selectedTournament(tournaments, searchParams.t);
  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink2">Sponsors belong to a tournament. Create one first.</p>
        <Link href="/dashboard/tournaments/new" className="btn-secondary text-sm inline-block mt-5">
          New tournament
        </Link>
      </div>
    );
  }

  const [settings, sponsors] = await Promise.all([
    moduleSettings(tournament.id),
    Sponsors.listByTournament(tournament.id),
  ]);
  const editing = searchParams.edit ? sponsors.find((s) => s.id === searchParams.edit) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Sponsors</h1>
        <p className="text-ink2">
          Local businesses backing this event. Banners appear on the public event page and the match centre, in
          priority order.
        </p>
      </div>

      <TournamentPicker tournaments={tournaments} selectedId={tournament.id} basePath="/organizer/sponsors" />

      <form action={saveModuleSettings.bind(null, tournament.id)} className="card p-4 sm:p-5">
        <input type="hidden" name="sponsorsEnabled__present" value="1" />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="sponsorsEnabled"
            defaultChecked={settings.sponsorsEnabled}
            className="mt-0.5 h-4 w-4 accent-pitch-400"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-inkDisplay">Show sponsor banners publicly</span>
            <span className="block text-[11px] text-ink3 mt-0.5">
              With this off, everything below is kept but nothing is shown to spectators — which is what you want
              between events, rather than deleting the lot and re-entering it next season.
            </span>
          </span>
        </label>
        <button type="submit" className="btn-secondary text-xs mt-3">
          Save visibility
        </button>
      </form>

      {/* Add / edit */}
      <form action={saveSponsor.bind(null, tournament.id)} className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">
          {editing ? `Edit ${editing.name}` : "Add a sponsor"}
        </h2>
        {editing && <input type="hidden" name="sponsorId" value={editing.id} />}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Name</span>
            <input name="name" required className="input w-full" defaultValue={editing?.name ?? ""} />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Tagline</span>
            <input name="tagline" className="input w-full" defaultValue={editing?.tagline ?? ""} placeholder="Wood-fired pizza, two blocks away" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Link (https)</span>
            <input name="url" className="input w-full" defaultValue={editing?.url ?? ""} placeholder="https://example.com" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Logo</span>
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="input w-full h-auto py-2.5" />
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Promo code</span>
            <input name="promoCode" className="input w-full" defaultValue={editing?.promoCode ?? ""} placeholder="COASTAL10" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">What it gets</span>
            <input name="promoDetail" className="input w-full" defaultValue={editing?.promoDetail ?? ""} placeholder="10% off any large pizza" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Priority</span>
            <input name="priority" type="number" min={0} max={99} className="input w-full" defaultValue={editing?.priority ?? 0} />
          </label>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" name="active" defaultChecked={editing ? editing.active === 1 : true} className="h-4 w-4 accent-pitch-400" />
          <span className="text-sm text-inkDisplay">This slot is live</span>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary text-sm">
            {editing ? "Save changes" : "Add sponsor"}
          </button>
          {editing && (
            <Link href={`/organizer/sponsors?t=${tournament.id}`} className="btn-ghost text-sm">
              Cancel
            </Link>
          )}
        </div>
      </form>

      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">
          {sponsors.length} sponsor{sponsors.length === 1 ? "" : "s"}
        </h2>
        {sponsors.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">Nobody yet.</p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                {s.logoMimeType ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/sponsors/${s.id}/logo`} alt="" className="h-10 w-10 rounded-xl object-contain bg-surface2 p-1 shrink-0" />
                ) : (
                  <span className="h-10 w-10 rounded-xl bg-neutralBadge flex items-center justify-center text-[11px] font-bold text-ink2 shrink-0">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-inkDisplay truncate">{s.name}</p>
                  <p className="text-[11px] text-ink3 truncate">
                    {s.tagline || "No tagline"}
                    {s.promoCode ? ` · ${s.promoCode}` : ""}
                    {` · priority ${s.priority}`}
                  </p>
                </div>
                <span className={`badge text-[10px] shrink-0 ${s.active === 1 ? "badge-accepted" : "bg-neutralBadge text-ink2"}`}>
                  {s.active === 1 ? "LIVE" : "PAUSED"}
                </span>
                <Link href={`/organizer/sponsors?t=${tournament.id}&edit=${s.id}`} className="btn-ghost text-xs shrink-0">
                  Edit
                </Link>
                <form action={deleteSponsor.bind(null, tournament.id, s.id)}>
                  <button type="submit" className="btn-ghost text-xs">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
