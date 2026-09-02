import { Players } from "@/lib/models";
import { decideAgeVerification } from "@/lib/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  AGE_CLASS,
  AGE_LABEL,
  FACE_CLASS,
  FACE_LABEL,
  ageDocLabel,
  ageFrom,
  verificationFor,
  type AgeStatus,
  type FaceCheck,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function VerificationQueuePage() {
  const pending = await Players.pendingAgeReview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-sm mb-1.5">Age verification</h1>
        <p className="text-ink2">
          Proof-of-age documents waiting on a decision. Opening one is restricted to admins and organizers — a coach
          cannot see these files, and they never appear on a player&apos;s public profile.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink2">Nothing waiting. Documents appear here the moment a player uploads one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => {
            const v = verificationFor(p);
            const age = ageFrom(p.birthdate);
            return (
              <div key={p.id} className="card p-5 sm:p-6">
                <div className="flex items-start gap-4 flex-wrap">
                  {p.photoUpdatedAt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/players/${p.id}/photo`}
                      alt=""
                      className="h-20 w-20 rounded-xl object-cover border border-line shrink-0"
                    
          loading="lazy"
          decoding="async"
        />
                  ) : (
                    <span className="h-20 w-20 rounded-xl bg-neutralBadge border border-line flex items-center justify-center text-sm font-bold text-ink2 shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-inkDisplay">{p.name}</p>
                    <p className="text-xs text-ink3">
                      {p.email ?? "no account email"}
                      {p.birthdate ? ` · born ${p.birthdate}` : ""}
                      {age !== null ? ` · ${age} years old` : ""}
                      {p.teamName ? ` · ${p.teamName}` : " · no club yet"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`badge text-[10px] ${FACE_CLASS[v.face as FaceCheck]}`}>
                        {FACE_LABEL[v.face as FaceCheck]}
                        {p.faceCheckScore != null ? ` · ${p.faceCheckScore}%` : ""}
                      </span>
                      <span className={`badge text-[10px] ${AGE_CLASS[v.age as AgeStatus]}`}>
                        {AGE_LABEL[v.age as AgeStatus]}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink3 mt-2">
                      The face percentage is what the applicant&apos;s own browser reported. Treat it as a hint, not
                      as evidence — the document below is the evidence.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href={`/api/players/${p.id}/document`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs text-center"
                    >
                      Open {ageDocLabel(p.ageDocType).toLowerCase()}
                    </a>
                    <form action={decideAgeVerification.bind(null, p.id, "VERIFIED")}>
                      <ConfirmButton
                        className="btn-primary text-xs w-full"
                        title={`Confirm ${p.name}'s age?`}
                        detail="Approving says you opened the document and it matches the date of birth on the account. This clears them to be named in a matchday squad, and your name is recorded against the decision."
                        confirmLabel="Yes, I checked the document"
                      >
                        Approve — age verified
                      </ConfirmButton>
                    </form>
                    <form action={decideAgeVerification.bind(null, p.id, "REJECTED")}>
                      <ConfirmButton
                        className="btn-ghost text-xs w-full"
                        title={`Reject ${p.name}'s document?`}
                        detail="They stay blocked from matchday squads until they upload something else. Jogo does not tell them automatically — you will need to contact them."
                        confirmLabel="Reject the document"
                      >
                        Reject
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
