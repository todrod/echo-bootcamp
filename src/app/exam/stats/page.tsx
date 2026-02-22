import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StatsPage() {
  const user = await requireUser();

  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, status: { in: ["FINISHED", "EXPIRED"] } },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { answers: true },
  });

  const scores = attempts.map((a) => {
    const totalCorrect = a.answers.filter((ans) => ans.isCorrect).length;
    return {
      id: a.id,
      mode: a.mode,
      status: a.status,
      totalCorrect,
      total: a.totalQuestions,
      percent: a.totalQuestions ? Math.round((totalCorrect / a.totalQuestions) * 100) : 0,
      date: a.startedAt,
    };
  });

  const avg = scores.length ? Math.round(scores.reduce((acc, s) => acc + s.percent, 0) / scores.length) : 0;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Exam Stats</h1>
        <p className="mt-2 text-sm text-slate-600">
          Completed attempts: {scores.length} • Average score: {avg}%
        </p>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent attempts</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th>Date</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-2">{s.date.toLocaleString()}</td>
                <td>{s.mode}</td>
                <td>{s.status}</td>
                <td>{s.totalCorrect}/{s.total} ({s.percent}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
