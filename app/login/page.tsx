"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@jogo.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Without this try/catch, any failure below fetch() actually resolving
    // (offline, a dropped connection, the function crashing with a
    // non-JSON error page) throws out of this handler entirely — loading
    // never gets reset and no error ever renders, so the button just sits
    // there disabled forever with nothing visibly wrong. That reads
    // exactly like "the login button doesn't do anything," so it's worth
    // catching and saying something rather than failing silently.
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      // Each account type lands somewhere different — an organizer's
      // tournament list isn't a team manager's roster isn't a player's
      // passport. ROLE_HOME mirrors lib/auth.ts's roleHome() since this is
      // a client component and can't import a server-only cookies() call.
      const ROLE_HOME: Record<string, string> = { ADMIN: "/admin", TEAM_MANAGER: "/team", PLAYER: "/me" };
      router.push(ROLE_HOME[data.role] || "/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-black/50 mb-6">
            Demo login is pre-filled — just hit log in.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="text-sm text-black/50 mt-6 text-center">
            New to Jogo?{" "}
            <Link href="/signup" className="text-pitch-600 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
