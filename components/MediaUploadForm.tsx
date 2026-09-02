"use client";

import { useState, useTransition } from "react";
import { uploadMedia } from "@/lib/actions";

export function MediaUploadForm({
  tournamentId,
  teams,
  policy,
}: {
  tournamentId: string;
  teams: { id: string; name: string }[];
  policy: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const result = await uploadMedia(tournamentId, fd);
          setNotice(result.error || "Uploaded. An organizer reviews it before it appears in the gallery.");
        })
      }
      className="card p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2">Add a photo</h2>
        <span className="badge bg-neutralBadge text-ink2 text-[10px]">
          {policy === "OPEN" ? "OPEN TO SPECTATORS" : "MEDIA STAFF ONLY"}
        </span>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Photo</span>
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required className="input w-full h-auto py-2.5" />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Team</span>
          <select name="teamId" className="input w-full">
            <option value="">Not team-specific</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Credit</span>
          <input name="credit" className="input w-full" placeholder="Your name, as it should be shown" />
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">Caption</span>
        <input name="caption" className="input w-full" placeholder="Riverside v Sunset, second half" />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary text-sm" disabled={pending}>
          {pending ? "Uploading…" : "Upload photo"}
        </button>
        {notice && (
          <span className="text-xs text-ink2" role="status">
            {notice}
          </span>
        )}
      </div>

      <p className="text-[11px] text-ink3">
        Nothing you upload appears publicly until an organizer approves it.
      </p>
    </form>
  );
}
