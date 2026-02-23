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
    <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Echo Bootcamp Access Notice</h1>
      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <p>This web app is for personal and private study use only.</p>
        <p>It is not medical advice, not a certification authority, and not affiliated with credentialing organizations.</p>
        <p>By continuing, you agree to use this tool only for educational preparation and review.</p>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void onAgree()}
        disabled={loading}
        className="mt-6 w-full rounded-lg bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? "Entering..." : "I Agree & Continue"}
      </button>
    </div>
  );
}
