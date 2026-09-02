import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { organizerTournaments, selectedTournament } from "@/lib/organizerScope";
import { moduleSettings, saveModuleSettings, decideMedia } from "@/lib/actions";
import { TournamentPicker } from "@/components/TournamentPicker";
import { MediaItems } from "@/lib/models";
import { formatDate } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function OrganizerMediaPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/organizer/media");
  const tournaments = await organizerTournaments(user);
  const tournament = selectedTournament(tournaments, searchParams.t);
  if (!tournament) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink2">The photo hub belongs to a tournament. Create one first.</p>
        <Link href="/dashboard/tournaments/new" className="btn-secondary text-sm inline-block mt-5">
          New tournament
        </Link>
      </div>
    );
  }

  const [settings, items] = await Promise.all([
    moduleSettings(tournament.id),
    MediaItems.listByTournament(tournament.id),
  ]);
  const pending = items.filter((i) => i.status === "PENDING");
  const decided = items.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Photo hub</h1>
        <p className="text-ink2">
          Every upload waits here. Nothing reaches the public gallery until you have looked at it — which is the only
          responsible default for photographs of other people&apos;s children.
        </p>
      </div>

      <TournamentPicker tournaments={tournaments} selectedId={tournament.id} basePath="/organizer/media" />

      <form action={saveModuleSettings.bind(null, tournament.id)} className="card p-5 sm:p-6 space-y-4">
        <input type="hidden" name="mediaEnabled__present" value="1" />
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="mediaEnabled" defaultChecked={settings.mediaEnabled} className="mt-0.5 h-4 w-4 accent-pitch-400" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-inkDisplay">Run a photo gallery for this event</span>
            <span className="block text-[11px] text-ink3 mt-0.5">
              With this off the gallery link returns nothing and uploads are refused, approved photos included.
            </span>
          </span>
        </label>

        <div>
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Who may upload</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { value: "STAFF", label: "Official media staff only", detail: "You, and anyone assigned to this event." },
              { value: "OPEN", label: "Open to parents & spectators", detail: "Any signed-in account. Still moderated." },
            ].map((option) => (
              <label
                key={option.value}
                className="cursor-pointer rounded-2xl bg-surface2 p-3.5 flex items-start gap-2.5"
              >
                <input
                  type="radio"
                  name="mediaUploadPolicy"
                  value={option.value}
                  defaultChecked={settings.mediaUploadPolicy === option.value}
                  className="mt-0.5 h-4 w-4 accent-pitch-400"
                />
                <span>
                  <span className="block text-sm font-semibold text-inkDisplay">{option.label}</span>
                  <span className="block text-[11px] text-ink3 mt-0.5">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary text-sm">
          Save photo settings
        </button>
      </form>

      <div className="card p-5 sm:p-6">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">
          Waiting on you · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">Nothing in the queue.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((item) => (
              <div key={item.id} className="rounded-2xl bg-surface2 overflow-hidden clay-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${item.id}/image`} alt="" className="w-full h-40 object-cover" />
                <div className="p-3.5 space-y-2">
                  <p className="text-sm text-inkDisplay line-clamp-2">{item.caption || "No caption"}</p>
                  <p className="text-[11px] text-ink3">
                    {item.credit || item.uploadedByName || "Unknown"} · {formatDate(item.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <form action={decideMedia.bind(null, tournament.id, item.id, "APPROVED")}>
                      <button type="submit" className="btn-primary text-xs">
                        Approve
                      </button>
                    </form>
                    <form action={decideMedia.bind(null, tournament.id, item.id, "REJECTED")}>
                      <button type="submit" className="btn-ghost text-xs">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-4">
            Already decided · {decided.length}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decided.map((item) => (
              <div key={item.id} className="rounded-2xl bg-surface2 overflow-hidden clay-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${item.id}/image`} alt="" className="w-full h-32 object-cover" />
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`badge text-[10px] ${item.status === "APPROVED" ? "badge-accepted" : "badge-danger"}`}>
                      {item.status}
                    </span>
                    {item.featured === 1 && <span className="badge badge-pending text-[10px]">FEATURED</span>}
                  </div>
                  <p className="text-[11px] text-ink3 truncate">
                    {item.reviewedByName ? `by ${item.reviewedByName}` : ""}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.status === "APPROVED" && (
                      <form action={decideMedia.bind(null, tournament.id, item.id, item.featured === 1 ? "UNFEATURE" : "FEATURE")}>
                        <button type="submit" className="btn-ghost text-xs">
                          {item.featured === 1 ? "Unfeature" : "Feature"}
                        </button>
                      </form>
                    )}
                    <form action={decideMedia.bind(null, tournament.id, item.id, "DELETE")}>
                      <button type="submit" className="btn-ghost text-xs">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
