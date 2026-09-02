"use client";

import { useState, useTransition } from "react";
import { registerPlayerAccount } from "@/lib/actions";
import { FacePhotoUpload, type FaceResult } from "@/components/FacePhotoUpload";
import { AGE_DOC_TYPES, GENDERS, POSITIONS } from "@/lib/verification";

type ClubOption = { id: string; name: string; tournamentName: string | null };

const STEPS = ["Account", "Photo", "Proof of age", "Club"] as const;

export function PlayerRegisterWizard({ clubs }: { clubs: ClubOption[] }) {
  const [step, setStep] = useState(0);
  const [face, setFace] = useState<FaceResult | null>(null);
  const [docChosen, setDocChosen] = useState(false);
  const [docType, setDocType] = useState<string>(AGE_DOC_TYPES[0].value);
  const [clubQuery, setClubQuery] = useState("");
  const [clubId, setClubId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Account fields are held here rather than left to the DOM because the
  // wizard hides earlier steps; a hidden <input> still posts, but the Next
  // button needs to know whether the step is complete.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [position, setPosition] = useState("");

  const accountReady = email.includes("@") && password.length >= 8 && name.trim().length > 1 && dob !== "";
  const filtered = clubQuery.trim()
    ? clubs.filter((c) => `${c.name} ${c.tournamentName ?? ""}`.toLowerCase().includes(clubQuery.trim().toLowerCase()))
    : clubs;

  const canAdvance = step === 0 ? accountReady : step === 1 ? face?.status === "PASSED" : step === 2 ? docChosen : true;

  // Continue and Create sit in the same spot, so the second half of a
  // double-click on the last Continue would land on the submit button and
  // create the account before the club step was ever seen. The submit arms
  // itself a moment after the step appears.
  const [armed, setArmed] = useState(false);
  function goToStep(next: number) {
    setArmed(false);
    setStep(next);
    if (next === STEPS.length - 1) window.setTimeout(() => setArmed(true), 350);
  }

  if (done) {
    return (
      <div className="card p-6 sm:p-8 text-center space-y-3">
        <span className="badge badge-pending text-[10px]">DOCUMENT PENDING VERIFICATION</span>
        <h2 className="text-xl font-semibold text-inkDisplay">Account created</h2>
        <p className="text-sm text-ink2 max-w-md mx-auto">{done}</p>
        <a href="/me" className="btn-primary text-sm inline-block mt-2">
          Go to my profile
        </a>
      </div>
    );
  }

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const result = await registerPlayerAccount(fd);
          if (result.error) setError(result.error);
          else setDone(result.detail);
        })
      }
      className="space-y-5"
    >
      {/* Step rail */}
      <ol className="flex items-center gap-2 flex-wrap">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                i === step
                  ? "border-pitch-400 bg-pitch-400/10 text-inkDisplay"
                  : i < step
                    ? "border-pitch-400/40 text-pitch-600"
                    : "border-line text-ink3"
              }`}
            >
              {i + 1}. {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-ink3 text-xs">→</span>}
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-6 space-y-5">
        {/* 1. Credentials and bio */}
        <div className={step === 0 ? "space-y-4" : "hidden"}>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Your account</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Email</span>
              <input name="email" type="email" required className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Password</span>
              <input name="password" type="password" required minLength={8} className="input w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="text-[11px] text-ink3 mt-1 block">At least 8 characters.</span>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Player’s full name</span>
              <input name="name" required className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Date of birth</span>
              <input name="birthdate" type="date" required className="input w-full" value={dob} onChange={(e) => setDob(e.target.value)} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Gender</span>
              <select name="gender" className="input w-full" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Primary position</span>
              <select name="position" className="input w-full" value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="">Select…</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-ink3">
            A parent or guardian can create and hold this account on a young player’s behalf — it is the same account
            either way.
          </p>
        </div>

        {/* 2. Face-checked headshot */}
        <div className={step === 1 ? "space-y-4" : "hidden"}>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Profile photo</h2>
          <FacePhotoUpload onResult={setFace} />
        </div>

        {/* 3. Proof of age */}
        <div className={step === 2 ? "space-y-4" : "hidden"}>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Proof of age</h2>
          <div>
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-2">Document type</span>
            <div className="grid sm:grid-cols-3 gap-2">
              {AGE_DOC_TYPES.map((d) => (
                <label
                  key={d.value}
                  className={`cursor-pointer rounded-xl border p-3 text-center transition-colors ${
                    docType === d.value ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="ageDocType"
                    value={d.value}
                    checked={docType === d.value}
                    onChange={() => setDocType(d.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-inkDisplay">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Upload the document</span>
            <input
              name="ageDoc"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              required
              className="input w-full h-auto py-2.5"
              onChange={(e) => setDocChosen(!!e.target.files?.length)}
            />
          </label>
          <div className="rounded-xl border border-line p-4">
            <span className="badge badge-pending text-[10px]">DOCUMENT PENDING VERIFICATION</span>
            <p className="text-[11px] text-ink2 mt-2">
              Only tournament organizers and Jogo admins can open this file, and only from the verification queue —
              it is never shown on your public profile, your passport card or to other clubs. A person reads it and
              decides; nothing here judges a document automatically.
            </p>
          </div>
        </div>

        {/* 4. Club association */}
        <div className={step === 3 ? "space-y-4" : "hidden"}>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Your club</h2>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Search clubs</span>
            <input
              className="input w-full"
              placeholder="Start typing a club name"
              value={clubQuery}
              onChange={(e) => setClubQuery(e.target.value)}
            />
          </label>
          <input type="hidden" name="requestedTeamId" value={clubId} />
          <div className="max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-lineSoft">
            <button
              type="button"
              onClick={() => setClubId("")}
              className={`w-full text-left px-4 py-3 transition-colors ${clubId === "" ? "bg-pitch-400/10" : "hover:bg-black/5"}`}
            >
              <span className="block text-sm font-semibold text-inkDisplay">No club yet</span>
              <span className="block text-[11px] text-ink3">Ask a coach to add you later.</span>
            </button>
            {filtered.slice(0, 40).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClubId(c.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${clubId === c.id ? "bg-pitch-400/10" : "hover:bg-black/5"}`}
              >
                <span className="block text-sm font-semibold text-inkDisplay">{c.name}</span>
                {c.tournamentName && <span className="block text-[11px] text-ink3">{c.tournamentName}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-4 text-sm text-ink2">No club matches that.</p>}
          </div>
          <p className="text-[11px] text-ink3">
            Choosing a club sends a request. The coach decides — selecting one here does not put you on their roster.
          </p>
        </div>

        {error && (
          <p className="text-sm text-warning-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          {step > 0 && (
            <button type="button" className="btn-ghost text-sm" onClick={() => goToStep(step - 1)} disabled={pending}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => goToStep(step + 1)}
              disabled={!canAdvance}
            >
              Continue
            </button>
          ) : (
            <button type="submit" className="btn-primary text-sm" disabled={pending || !armed}>
              {pending ? "Creating account…" : "Create player account"}
            </button>
          )}
          {step === 1 && face?.status !== "PASSED" && (
            <span className="text-[11px] text-ink3">A photo with a detected face is needed to continue.</span>
          )}
        </div>
      </div>
    </form>
  );
}
