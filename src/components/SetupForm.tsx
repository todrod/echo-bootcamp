"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { CATEGORY_LABELS_BY_TRACK, EXAM_TRACKS } from "@/lib/examTracks";

type SetupFormProps = {
  mode: "FULL" | "PRACTICE";
  initialExamTrack?: "RSC" | "ACS";
};

const categoryCodes = ["A", "B", "C", "D", "E"] as const;

export function SetupForm({ mode, initialExamTrack = "RSC" }: SetupFormProps) {
  const router = useRouter();
  const [examTrack, setExamTrack] = useState<"RSC" | "ACS">(initialExamTrack);
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

  const categories = useMemo(
    () =>
      categoryCodes.map((code) => ({
        code,
        label: CATEGORY_LABELS_BY_TRACK[examTrack][code],
      })),
    [examTrack],
  );

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
        examTrack,
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
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
      <h1 className="text-2xl font-semibold text-white">{mode === "FULL" ? "Full Exam Setup" : "Practice Setup"}</h1>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-100">Exam track</p>
        <div className="flex flex-wrap gap-2">
          {EXAM_TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => setExamTrack(track.id)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                examTrack === track.id
                  ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-100"
                  : "border-white/20 bg-black/20 text-slate-200 hover:border-cyan-300/50 hover:bg-cyan-500/10"
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>
      </div>
      {resumeAttemptId ? (
        <button
          type="button"
          onClick={() => router.push(`/exam/session/${resumeAttemptId}`)}
          className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-1 text-sm text-amber-100"
        >
          Resume in-progress attempt
        </button>
      ) : null}

      {mode === "PRACTICE" ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-100">Question count</p>
          <div className="flex flex-wrap gap-2">
            {[25, 50, 75, 100].map((n) => (
              <button
                key={n}
                type="button"
                className={`rounded-lg border px-3 py-1 text-sm ${count === n ? "border-cyan-300/70 bg-cyan-500/20 text-cyan-100" : "border-white/20 bg-black/20 text-slate-200 hover:border-cyan-300/50 hover:bg-cyan-500/10"}`}
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
              className="w-24 rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-slate-100"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
          Exam mode is fixed to 170 questions.
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-100">Categories (leave empty = All)</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <label key={cat.code} className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.code)}
                onChange={() => toggleCategory(cat.code)}
              />
              <span className="font-semibold">{cat.code}</span>
              <span>{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-100">Timing</p>
        <div className="space-y-2 text-sm text-slate-200">
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
                className="w-24 rounded border border-white/20 bg-black/20 px-2 py-1 text-slate-100"
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
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={useWeighting}
            onChange={(e) => setUseWeighting(e.target.checked)}
          />
          Use exam weighting (when categories = All)
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        disabled={loading}
        className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Start session"}
      </button>
    </form>
  );
}
