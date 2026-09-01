"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await acceptInvite(token, formData);
          if (result.error) setError(result.error);
          // acceptInvite sets the session cookie, so the redirect lands the
          // new account straight in the app rather than at a sign-in form
          // asking for the password they just chose.
          else router.push("/dashboard");
        });
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
          Choose a password
        </span>
        <input
          name="password"
          type="password"
          className="input w-full"
          minLength={8}
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </label>
      {error && (
        <p className="text-xs text-warning-500" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary text-sm w-full" disabled={pending}>
        {pending ? "Setting up…" : "Accept invitation"}
      </button>
    </form>
  );
}
