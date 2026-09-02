"use client";

import { useState, useTransition } from "react";
import { addPlayerToRoster, removePlayerFromRoster } from "@/lib/actions";
import {
  AGE_CLASS,
  AGE_LABEL,
  FACE_CLASS,
  FACE_LABEL,
  ageFrom,
  verificationFor,
  type AgeStatus,
  type FaceCheck,
} from "@/lib/verification";

export interface RosterCandidate {
  id: string;
  name: string;
  email: string | null;
  birthdate: string | null;
  position: string | null;
  passportId: string;
  photoUpdatedAt: string | null;
  faceCheckStatus: string | null;
  ageDocUploadedAt: string | null;
  ageStatus: string | null;
  teamId: string | null;
  teamName: string | null;
}

function Badges({ player }: { player: RosterCandidate }) {
  const v = verificationFor(player);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`badge text-[10px] ${FACE_CLASS[v.face as FaceCheck]}`}>{FACE_LABEL[v.face as FaceCheck]}</span>
      <span className={`badge text-[10px] ${AGE_CLASS[v.age as AgeStatus]}`}>{AGE_LABEL[v.age as AgeStatus]}</span>
    </div>
  );
}

function Avatar({ player }: { player: RosterCandidate }) {
  if (!player.photoUpdatedAt) {
    return (
      <span className="h-10 w-10 shrink-0 rounded-full bg-neutralBadge border border-line flex items-center justify-center text-[11px] font-bold text-ink2">
        {player.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/players/${player.id}/photo`}
      alt=""
      className="h-10 w-10 shrink-0 rounded-full object-cover border border-line"
    />
  );
}

export function RosterSearch({
  teamId,
  squad,
  initialCandidates,
}: {
  teamId: string;
  squad: RosterCandidate[];
  initialCandidates: RosterCandidate[];
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Filtering happens here over the accounts the server already sent: the
  // list is small, and a keystroke-per-request search would be slower and
  // noisier than the thing it replaces.
  const q = query.trim().toLowerCase();
  const candidates = q
    ? initialCandidates.filter((c) =>
        `${c.name} ${c.email ?? ""} ${c.passportId}`.toLowerCase().includes(q)
      )
    : initialCandidates;

  function add(playerId: string) {
    startTransition(async () => {
      const result = await addPlayerToRoster(playerId, teamId);
      setNotice(result.error || "Added to your squad.");
    });
  }
  function remove(playerId: string) {
    startTransition(async () => {
      const result = await removePlayerFromRoster(playerId);
      setNotice(result.error || "Removed from your squad. The player keeps their account.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Add a registered player</h2>
          {notice && (
            <span className="text-xs text-ink2" role="status">
              {notice}
            </span>
          )}
        </div>
        <input
          className="input w-full"
          placeholder="Search by name, email or player ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {candidates.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">
            {q ? "No player account matches that." : "No unattached player accounts yet."}
          </p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {candidates.slice(0, 25).map((c) => {
              const v = verificationFor(c);
              const age = ageFrom(c.birthdate);
              return (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <Avatar player={c} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-inkDisplay truncate">{c.name}</p>
                    <p className="text-[11px] text-ink3 truncate">
                      {c.email ?? "no email"}
                      {age !== null ? ` · ${age}y` : ""}
                      {c.position ? ` · ${c.position}` : ""}
                    </p>
                    <div className="mt-1.5">
                      <Badges player={c} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(c.id)}
                    disabled={pending}
                    className="btn-secondary text-xs shrink-0"
                  >
                    + Add to roster
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-ink3">
          Adding a player links their verified account to your squad. It does not clear them for a matchday roster —
          that needs an organizer to approve their document.
        </p>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">
          Your squad · {squad.length} player{squad.length === 1 ? "" : "s"}
        </h2>
        {squad.length === 0 ? (
          <p className="text-sm text-ink2 py-6 text-center">Nobody on this squad yet.</p>
        ) : (
          <div className="divide-y divide-lineSoft">
            {squad.map((p) => {
              const v = verificationFor(p);
              const age = ageFrom(p.birthdate);
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <Avatar player={p} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-inkDisplay truncate">{p.name}</p>
                    <p className="text-[11px] text-ink3 truncate">
                      {p.email ?? "roster entry, no account"}
                      {age !== null ? ` · ${age}y` : ""}
                      {p.position ? ` · ${p.position}` : ""}
                    </p>
                    <div className="mt-1.5">
                      <Badges player={p} />
                    </div>
                    {!v.rosterEligible && (
                      <p className="text-[11px] text-warning-500 mt-1">
                        Cannot be named in a matchday squad — {v.blockedReason}.
                      </p>
                    )}
                  </div>
                  <span
                    className={`badge text-[10px] shrink-0 ${v.rosterEligible ? "badge-accepted" : "badge-pending"}`}
                  >
                    {v.rosterEligible ? "MATCHDAY CLEARED" : "MATCHDAY BLOCKED"}
                  </span>
                  {p.email && (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      disabled={pending}
                      className="btn-ghost text-xs shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
