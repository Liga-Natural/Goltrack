"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@goltrack.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
          <p className="text-sm text-white/50 mb-6">
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="text-sm text-white/50 mt-6 text-center">
            New to GolTrack?{" "}
            <Link href="/signup" className="text-pitch-400 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
