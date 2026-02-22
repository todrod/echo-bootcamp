"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

type SetupFormProps = {
  mode: "FULL" | "PRACTICE";
};

const categories = ["A", "B", "C", "D", "E"] as const;

export function SetupForm({ mode }: SetupFormProps) {
  const router = useRouter();
  const [count, setCount] = useState(mode === "FULL" ? 170 : 50);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [timerSetting, setTimerSetting] = useState<"EXACT" | "CUSTOM" | "UNTIMED">("EXACT");
  const [customMinutes, setCustomMinutes] = useState(180);
  const [useWeighting, setUseWeighting] = useState(true);
  const [resumeAttemptId, setResumeAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = useMemo(() => {
    if (mode === "FULL") return 170;
    return count;
  }, [count, mode]);

  useEffect(() => {
    let mounted = true;
    apiFetch<{ inProgress: { id: string } | null }>("/api/attempts/in-progress")
      .then((res) => {
        if (mounted) setResumeAttemptId(res.inProgress?.id ?? null);
      })
      .catch(() => {
        if (mounted) setResumeAttemptId(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        mode,
        count: total,
        categories: selectedCategories.length ? selectedCategories : undefined,
        timerSetting,
        timeLimitMinutes:
          timerSetting === "EXACT"
            ? 180
            : timerSetting === "CUSTOM"
              ? customMinutes
              : null,
        useWeighting: mode === "PRACTICE" ? useWeighting : true,
      };
      const result = await apiFetch<{ attemptId: string }>("/api/attempts/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/exam/session/${result.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create attempt");
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category: string) {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{mode === "FULL" ? "Full Exam Setup" : "Practice Setup"}</h1>
      {resumeAttemptId ? (
        <button
          type="button"
          onClick={() => router.push(`/exam/session/${resumeAttemptId}`)}
          className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1 text-sm"
        >
          Resume in-progress attempt
        </button>
      ) : null}

      {mode === "PRACTICE" ? (
        <div>
          <p className="mb-2 text-sm font-medium">Question count</p>
          <div className="flex flex-wrap gap-2">
            {[25, 50, 75, 100].map((n) => (
              <button
                key={n}
                type="button"
                className={`rounded-lg border px-3 py-1 ${count === n ? "border-cyan-600 bg-cyan-50" : "border-slate-300"}`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={5}
              max={170}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          Exam mode is fixed to 170 questions.
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Categories (leave empty = All)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1 text-sm">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Timing</p>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={timerSetting === "EXACT"}
              onChange={() => setTimerSetting("EXACT")}
            />
            Exact exam settings ({mode === "FULL" ? "locked to" : "default"} 180 min)
          </label>
          {mode !== "FULL" ? (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={timerSetting === "CUSTOM"}
                onChange={() => setTimerSetting("CUSTOM")}
              />
              Custom
              <input
                type="number"
                min={5}
                max={240}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                className="w-24 rounded border border-slate-300 px-2 py-1"
              />
              minutes
            </label>
          ) : null}
          {mode !== "FULL" ? (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={timerSetting === "UNTIMED"}
                onChange={() => setTimerSetting("UNTIMED")}
              />
              Untimed
            </label>
          ) : null}
        </div>
      </div>

      {mode === "PRACTICE" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useWeighting}
            onChange={(e) => setUseWeighting(e.target.checked)}
          />
          Use exam weighting (when categories = All)
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        disabled={loading}
        className="rounded-lg bg-cyan-700 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {loading ? "Creating..." : "Start session"}
      </button>
    </form>
  );
}
