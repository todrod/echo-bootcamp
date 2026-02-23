"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

export function AuthForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onAgree() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "study_user", createIfMissing: true }),
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
    <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-white/12 bg-black/30 p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
      <h1 className="text-2xl font-semibold text-white">Echo Bootcamp Access Notice</h1>
      <div className="mt-4 space-y-3 text-sm text-slate-200">
        <p>This web app is for personal and private study use only.</p>
        <p>It is not medical advice, not a certification authority, and not affiliated with credentialing organizations.</p>
        <p>By continuing, you agree to use this tool only for educational preparation and review.</p>
      </div>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        onClick={() => void onAgree()}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
      >
        {loading ? "Entering..." : "I Agree & Continue"}
      </button>
    </div>
  );
}
