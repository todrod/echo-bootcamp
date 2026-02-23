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
  userAnswer: string | null;
  correctLabel: string;
  markedForReview: boolean;
  isCorrect: boolean;
};

type Props = {
  attemptId: string;
  mode: "FULL" | "PRACTICE";
  percent: number;
  totalCorrect: number;
  totalQuestions: number;
  timeUsedMinutes: number;
  status: string;
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
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Results ({props.status})</h1>
        <p className="mt-2 text-sm text-slate-600">
          Score: {props.totalCorrect}/{props.totalQuestions} ({props.percent}%) • Time used: {props.timeUsedMinutes} min
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/exam")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            Return to Bootcamp
          </button>
          <button
            onClick={() => void retrySameTest()}
            disabled={retrying}
            className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {retrying ? "Starting..." : "Retry same test"}
          </button>
          <button
            onClick={() => router.push(props.mode === "FULL" ? "/exam/full/setup" : "/exam/practice/setup")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            Try different setup
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Category breakdown</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th>Category</th>
              <th>Correct</th>
              <th>Total</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            {props.categoryBreakdown.map((c) => (
              <tr key={c.category} className="border-t border-slate-100">
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
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Weakest categories</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {props.weakestCategories.map((c) => (
              <li key={c.category}>{c.category} - {c.label}: {c.percent}%</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Missed-most questions</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {props.missedMost.map((m) => (
              <li key={m.questionId}>#{m.questionId} ({m.misses} misses): {m.stem.slice(0, 80)}...</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex gap-4 text-sm">
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
            <div key={item.questionId} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Q{item.orderIndex + 1} • Category {item.category}</p>
              <p className="font-medium">{item.stem}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {item.choices.map((choice) => {
                  const isUser = item.userAnswer === choice.label;
                  const isCorrect = item.correctLabel === choice.label;
                  return (
                    <li key={choice.id} className={`${isUser ? "font-semibold" : ""} ${showCorrect && isCorrect ? "text-emerald-700" : ""}`}>
                      {choice.label}. {choice.text}
                    </li>
                  );
                })}
              </ul>
              <p className={`mt-2 text-sm ${item.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                Your answer: {item.userAnswer ?? "Unanswered"}
                {showCorrect ? ` • Correct: ${item.correctLabel}` : ""}
              </p>
              {showExplanations && item.explanation ? (
                <p className="mt-2 text-sm text-slate-700">Explanation: {item.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
