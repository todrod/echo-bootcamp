import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRemainingSeconds } from "@/lib/exam";

export default async function ExamHomePage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const logoSrc = `${basePath}/todrod-echo-bootcamp-logo.png`;
  const user = await requireUser();
  const inProgress = await prisma.attempt.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  const remainingSeconds =
    inProgress && inProgress.timed
      ? computeRemainingSeconds(inProgress.startedAt, inProgress.timeLimitMinutes)
      : null;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Echo Bootcamp Exam</h1>
            <p className="mt-2 text-sm text-slate-300">Welcome, {user.username}.</p>
          </div>
          <img
            src={logoSrc}
            alt="Todrod Echo Bootcamp logo"
            className="h-auto w-36 rounded-xl border border-white/10 bg-white/5 p-1 sm:w-44"
          />
        </div>
        {inProgress ? (
          <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p>
              In-progress attempt found ({inProgress.mode}) • Remaining:
              {remainingSeconds === null ? " untimed" : ` ${Math.max(0, Math.floor(remainingSeconds / 60))} min`}
            </p>
            <Link href={`/exam/session/${inProgress.id}`} className="mt-2 inline-block rounded-lg bg-cyan-500 px-3 py-1 text-slate-950">
              Resume
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href="/exam/full/setup" className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur hover:border-cyan-300/40">
          <h2 className="text-xl font-semibold text-white">Full Exam Mode</h2>
          <p className="mt-2 text-sm text-slate-300">170 questions, weighted by category, no feedback until completion.</p>
        </Link>
        <Link href="/exam/practice/setup" className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur hover:border-cyan-300/40">
          <h2 className="text-xl font-semibold text-white">Practice Mode</h2>
          <p className="mt-2 text-sm text-slate-300">Choose count, categories, timing and weighting behavior.</p>
        </Link>
        <Link href="/exam/stats" className="rounded-2xl border border-white/12 bg-black/30 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur hover:border-cyan-300/40">
          <h2 className="text-xl font-semibold text-white">Your Stats</h2>
          <p className="mt-2 text-sm text-slate-300">Track progress, weak categories, and recent outcomes.</p>
        </Link>
      </div>
    </main>
  );
}
