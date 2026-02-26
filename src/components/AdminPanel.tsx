"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/client";

type QuestionLite = {
  id: number;
  stem: string;
  category: string | null;
  difficulty: string | null;
  explanation: string | null;
  tagConfidence: number | null;
};

type Props = {
  weights: { categoryCode: string; weight: number }[];
  questions: QuestionLite[];
};

export function AdminPanel({ weights: initialWeights, questions }: Props) {
  const [weights, setWeights] = useState(initialWeights);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuestionLite | null>(null);

  async function importQuestions(examTrack: "RSC" | "ACS") {
    setMessage(null);
    const result = await apiFetch<{ imported: number; examTrack: "RSC" | "ACS" }>("/api/admin/import", {
      method: "POST",
      body: JSON.stringify({ examTrack }),
    });
    setMessage(`Imported ${result.imported} ${result.examTrack} questions.`);
  }

  async function saveWeights(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    await apiFetch("/api/admin/weights", {
      method: "POST",
      body: JSON.stringify({ weights }),
    });
    setMessage("Weights saved.");
  }

  async function saveQuestion(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await apiFetch(`/api/admin/questions/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        category: editing.category,
        difficulty: editing.difficulty,
        explanation: editing.explanation,
        tagConfidence: editing.tagConfidence ?? 0.5,
      }),
    });
    setMessage(`Question #${editing.id} updated.`);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin-lite tools</h1>
        <p className="mt-2 text-sm text-slate-600">
          Import exam banks, tune weights, and edit question tags/explanations.
          ACS import can take a few minutes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => void importQuestions("RSC")} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white">
            Import RSC bank
          </button>
          <button onClick={() => void importQuestions("ACS")} className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100">
            Re-import ACS bank (300)
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          For a full clean ACS refresh from local data, run <code>npm run acs:reload</code> in terminal.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Exam weights</h2>
        <form onSubmit={saveWeights} className="mt-3 space-y-3">
          {weights.map((w, i) => (
            <label key={w.categoryCode} className="flex items-center gap-3 text-sm">
              <span className="w-6 font-semibold">{w.categoryCode}</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={w.weight}
                onChange={(e) => {
                  const next = [...weights];
                  next[i] = { ...w, weight: Number(e.target.value) };
                  setWeights(next);
                }}
                className="w-28 rounded border border-slate-300 px-2 py-1"
              />
            </label>
          ))}
          <button className="rounded-lg border border-slate-300 px-3 py-1 text-sm">Save weights</button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Question editor</h2>
        <div className="mt-3 grid gap-3">
          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => setEditing(q)}
              className="rounded-lg border border-slate-300 p-3 text-left"
            >
              <p className="text-sm font-semibold">#{q.id} • {q.category ?? "-"} • {q.difficulty ?? "-"}</p>
              <p className="mt-1 text-sm text-slate-700">{q.stem.slice(0, 120)}...</p>
            </button>
          ))}
        </div>
      </section>

      {editing ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Edit question #{editing.id}</h3>
          <form onSubmit={saveQuestion} className="mt-3 space-y-3">
            <label className="block text-sm">
              Category
              <select
                value={editing.category ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value || null })}
                className="mt-1 w-full rounded border border-slate-300 p-2"
              >
                <option value="">None</option>
                {['A', 'B', 'C', 'D', 'E'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Difficulty
              <select
                value={editing.difficulty ?? ""}
                onChange={(e) => setEditing({ ...editing, difficulty: e.target.value || null })}
                className="mt-1 w-full rounded border border-slate-300 p-2"
              >
                <option value="">None</option>
                {['EASY', 'MEDIUM', 'HARD'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Confidence (0..1)
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={editing.tagConfidence ?? 0.5}
                onChange={(e) => setEditing({ ...editing, tagConfidence: Number(e.target.value) })}
                className="mt-1 w-full rounded border border-slate-300 p-2"
              />
            </label>
            <label className="block text-sm">
              Explanation
              <textarea
                value={editing.explanation ?? ""}
                onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                className="mt-1 min-h-32 w-full rounded border border-slate-300 p-2"
              />
            </label>
            <div className="flex gap-3">
              <button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white">Save question</button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </section>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
