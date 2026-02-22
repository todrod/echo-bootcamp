"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function AuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [createIfMissing, setCreateIfMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, createIfMissing }),
      });
      router.push("/exam");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Echo Bootcamp Login</h1>
      <p className="mt-2 text-sm text-slate-600">Username + PIN/password only. No email required.</p>

      <label className="mt-6 block text-sm font-medium">Username</label>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2"
        required
      />

      <label className="mt-4 block text-sm font-medium">PIN / Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 p-2"
        required
      />

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={createIfMissing}
          onChange={(e) => setCreateIfMissing(e.target.checked)}
        />
        Create account if missing
      </label>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
