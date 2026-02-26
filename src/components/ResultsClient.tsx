"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";

type ReviewItem = {
  orderIndex: number;
  questionId: number;
  stem: string;
  category: string;
  difficulty: string | null;
  explanation: string | null;
  choices: { id: number; label: string; text: string }[];
  userAnswer: string[];
  correctLabels: string[];
  markedForReview: boolean;
  isCorrect: boolean;
};

type Props = {
  attemptId: string;
  mode: "FULL" | "PRACTICE";
  examTrack: "RSC" | "ACS";
  examTrackLabel: string;
  percent: number;
  totalCorrect: number;
  totalQuestions: number;
  timeUsedMinutes: number;
  status: string;
  categoryLegend: { category: string; label: string }[];
  categoryBreakdown: { category: string; label: string; correct: number; total: number; percent: number }[];
  weakestCategories: { category: string; label: string; correct: number; total: number; percent: number }[];
  missedMost: { questionId: number; misses: number; stem: string }[];
  review: ReviewItem[];
};

export function ResultsClient(props: Props) {
  const router = useRouter();
  const [showCorrect, setShowCorrect] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function retrySameTest() {
    setRetrying(true);
    try {
      const res = await apiFetch<{ attemptId: string }>(`/api/attempts/${props.attemptId}/retry`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/exam/session/${res.attemptId}`);
    } catch (error) {
      // Keep fallback simple in v1.
      alert(error instanceof Error ? error.message : "Could not retry test");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Results ({props.status})</h1>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          <span className="rounded bg-cyan-400/20 px-1.5 py-0.5">{props.examTrack}</span>
          <span>{props.examTrackLabel}</span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Score: {props.totalCorrect}/{props.totalQuestions} ({props.percent}%) • Time used: {props.timeUsedMinutes} min
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/exam")}
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 hover:bg-cyan-500/10"
          >
            Return to Bootcamp
          </button>
          <button
            onClick={() => void retrySameTest()}
            disabled={retrying}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {retrying ? "Starting..." : "Retry same test"}
          </button>
          <button
            onClick={() =>
              router.push(
                props.mode === "FULL"
                  ? `/exam/full/setup?track=${props.examTrack}`
                  : `/exam/practice/setup?track=${props.examTrack}`,
              )
            }
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:border-cyan-300/50 hover:bg-cyan-500/10"
          >
            Try different setup
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
        <h2 className="text-lg font-semibold text-white">Category breakdown</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
          {props.categoryLegend.map((item) => (
            <span key={item.category} className="rounded-full border border-white/20 bg-white/5 px-2 py-1">
              {item.category}: {item.label}
            </span>
          ))}
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th>Category</th>
              <th>Correct</th>
              <th>Total</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            {props.categoryBreakdown.map((c) => (
              <tr key={c.category} className="border-t border-white/10 text-slate-100">
                <td className="py-2">{c.category} - {c.label}</td>
                <td>{c.correct}</td>
                <td>{c.total}</td>
                <td>{c.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Weakest categories</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {props.weakestCategories.map((c) => (
              <li key={c.category}>{c.category} - {c.label}: {c.percent}%</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Missed-most questions</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {props.missedMost.map((m) => (
              <li key={m.questionId}>#{m.questionId} ({m.misses} misses): {m.stem.slice(0, 80)}...</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="mb-4 flex gap-4 text-sm text-slate-200">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showCorrect} onChange={(e) => setShowCorrect(e.target.checked)} />
            Show correct answers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showExplanations} onChange={(e) => setShowExplanations(e.target.checked)} />
            Show explanations
          </label>
        </div>

        <div className="space-y-4">
          {props.review.map((item) => (
            <div key={item.questionId} className="rounded-lg border border-white/12 bg-black/20 p-4">
              <p className="text-sm text-slate-400">Q{item.orderIndex + 1} • Category {item.category}</p>
              <p className="font-medium text-slate-100">{item.stem}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {item.choices.map((choice) => {
                  const isUser = item.userAnswer.includes(choice.label);
                  const isCorrect = item.correctLabels.includes(choice.label);
                  return (
                    <li key={choice.id} className={`${isUser ? "font-semibold" : ""} ${showCorrect && isCorrect ? "text-emerald-400" : ""}`}>
                      {choice.label}. {choice.text}
                    </li>
                  );
                })}
              </ul>
              <p className={`mt-2 text-sm ${item.isCorrect ? "text-emerald-400" : "text-red-300"}`}>
                Your answer: {item.userAnswer.length ? item.userAnswer.join(", ") : "Unanswered"}
                {showCorrect ? ` • Correct: ${item.correctLabels.join(", ")}` : ""}
              </p>
              {showExplanations && item.explanation ? (
                <p className="mt-2 text-sm text-slate-300">Explanation: {item.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
