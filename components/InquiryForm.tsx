"use client";

import { useState } from "react";

const tournamentTypes = ["Round robin", "Groups + knockout", "Single elimination", "Futsal / indoor", "Not sure yet"];

export function InquiryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        tournamentType: form.get("tournamentType") || undefined,
        message: form.get("message"),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong — try again.");
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="card p-6 text-center">
        <p className="text-pitch-600 font-semibold mb-1.5">Message sent — thanks!</p>
        <p className="text-black/50 text-sm">We&apos;ll get back to you shortly. No account needed on your end.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input className="input" name="name" required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" name="email" required />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Phone (optional)</label>
          <input className="input" name="phone" />
        </div>
        <div>
          <label className="label">Tournament type</label>
          <select className="input" name="tournamentType" defaultValue="">
            <option value="" disabled>
              Select one
            </option>
            {tournamentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Tell us about your event</label>
        <textarea className="input min-h-[110px]" name="message" required placeholder="Team count, dates, venue, anything else." />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : "Send inquiry"}
      </button>
      <p className="text-xs text-black/30 text-center">No account required — we&apos;ll follow up by email.</p>
    </form>
  );
}
