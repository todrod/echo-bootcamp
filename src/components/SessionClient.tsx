"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

type SessionQuestion = {
  questionId: number;
  orderIndex: number;
  stem: string;
  choices: { label: string; text: string }[];
  selectedLabel: string | null;
  markedForReview: boolean;
};

type SessionProps = {
  attemptId: string;
  timed: boolean;
  totalQuestions: number;
  timeLimitMinutes: number | null;
  startedAt: string;
  lastViewedQuestionIndex: number;
  questions: SessionQuestion[];
};

export function SessionClient(props: SessionProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(props.questions);
  const [index, setIndex] = useState(props.lastViewedQuestionIndex || 0);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!props.timed || !props.timeLimitMinutes) return null;
    const elapsed = Math.floor((Date.now() - new Date(props.startedAt).getTime()) / 1000);
    return props.timeLimitMinutes * 60 - elapsed;
  });

  const current = questions[index];
  const answeredCount = questions.filter((q) => q.selectedLabel).length;
  const remainingCount = props.totalQuestions - answeredCount;

  const elapsedMinutes = useMemo(() => {
    if (!props.timed || !props.timeLimitMinutes || remainingSeconds === null) return 0;
    return (props.timeLimitMinutes * 60 - Math.max(remainingSeconds, 0)) / 60;
  }, [props.timeLimitMinutes, props.timed, remainingSeconds]);

  const timeRemainingMinutes = useMemo(() => {
    if (!props.timed || remainingSeconds === null) return null;
    return Math.max(remainingSeconds, 0) / 60;
  }, [props.timed, remainingSeconds]);

  const requiredPace = useMemo(() => {
    if (timeRemainingMinutes === null || remainingCount <= 0) return null;
    return timeRemainingMinutes / remainingCount;
  }, [timeRemainingMinutes, remainingCount]);

  const currentPace = answeredCount > 0 ? elapsedMinutes / answeredCount : null;
  const aheadBehind =
    currentPace !== null && timeRemainingMinutes !== null
      ? timeRemainingMinutes - currentPace * remainingCount
      : null;

  useEffect(() => {
    if (!props.timed || remainingSeconds === null) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(timer);
          void finish(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.timed]);

  async function saveAnswer(changes: Partial<SessionQuestion>) {
    if (!current) return;
    const updated = { ...current, ...changes };
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));

    await apiFetch(`/api/attempts/${props.attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify({
        questionId: current.questionId,
        selectedChoice: updated.selectedLabel,
        markedForReview: updated.markedForReview,
        lastViewedQuestionIndex: index,
      }),
    });
  }

  async function finish(forceExpire = false) {
    setSubmitting(true);
    try {
      await apiFetch(`/api/attempts/${props.attemptId}/finish`, {
        method: "POST",
        body: JSON.stringify({ forceExpire }),
      });
      router.push(`/exam/results/${props.attemptId}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return <p className="p-6 text-slate-200">No question found.</p>;

  return (
    <div className="pb-28">
      <div className="mb-4 rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-sm text-slate-400">
          Question {index + 1} / {props.totalQuestions}
        </p>
        <h1 className="mt-2 text-lg font-semibold text-slate-100">{current.stem}</h1>

        <div className="mt-4 space-y-2">
          {current.choices.map((choice) => (
            <button
              key={choice.label}
              onClick={() => void saveAnswer({ selectedLabel: choice.label })}
              className={`block w-full rounded-lg border p-3 text-left text-slate-100 ${
                current.selectedLabel === choice.label
                  ? "border-cyan-300/70 bg-cyan-500/20"
                  : "border-white/20 bg-black/20 hover:border-cyan-300/50 hover:bg-cyan-500/10"
              }`}
            >
              <span className="font-semibold">{choice.label}.</span> {choice.text}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void saveAnswer({ markedForReview: !current.markedForReview })}
            className={`rounded-lg border px-3 py-1 text-sm text-slate-100 ${current.markedForReview ? "border-amber-300/60 bg-amber-500/10 text-amber-100" : "border-white/20 bg-black/20 hover:border-cyan-300/50 hover:bg-cyan-500/10"}`}
          >
            {current.markedForReview ? "Marked for review" : "Mark for review"}
          </button>

          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-sm text-slate-100 hover:border-cyan-300/50 hover:bg-cyan-500/10 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(props.totalQuestions - 1, i + 1))}
            disabled={index >= props.totalQuestions - 1}
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-sm text-slate-100 hover:border-cyan-300/50 hover:bg-cyan-500/10 disabled:opacity-40"
          >
            Next
          </button>
          <button
            onClick={() => void finish(false)}
            disabled={submitting}
            className="rounded-lg bg-cyan-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Submit attempt
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/12 bg-black/30 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
        <p className="mb-2 text-sm font-medium text-slate-100">Navigator</p>
        <div className="grid grid-cols-10 gap-2">
          {questions.map((q, i) => {
            const stateClass = q.markedForReview
              ? "border-amber-300/60 bg-amber-500/10 text-amber-100"
              : q.selectedLabel
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                : "border-white/20 bg-black/20 text-slate-100";
            return (
              <button
                key={q.questionId}
                onClick={() => setIndex(i)}
                className={`rounded border px-2 py-1 text-xs ${stateClass} ${i === index ? "ring-2 ring-cyan-400" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/15 bg-slate-950/90 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <span>
            Time: {timeRemainingMinutes === null ? "Untimed" : `${Math.floor(timeRemainingMinutes)} min`}
          </span>
          <span>
            Answered: {answeredCount}/{props.totalQuestions}
          </span>
          <span>Remaining: {remainingCount}</span>
          <span>Required pace: {requiredPace === null ? "-" : `${requiredPace.toFixed(2)} min/q`}</span>
          <span>Current pace: {currentPace === null ? "-" : `${currentPace.toFixed(2)} min/q`}</span>
          <span className={aheadBehind !== null && aheadBehind < 0 ? "text-red-300" : "text-emerald-300"}>
            {aheadBehind === null
              ? "Delta: -"
              : aheadBehind >= 0
                ? `Ahead by ${aheadBehind.toFixed(1)} min`
                : `Behind by ${Math.abs(aheadBehind).toFixed(1)} min`}
          </span>
        </div>
      </div>
    </div>
  );
}
