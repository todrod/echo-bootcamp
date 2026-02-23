import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRemainingSeconds } from "@/lib/exam";

export default async function ExamHomePage() {
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
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Echo Bootcamp Exam</h1>
            <p className="mt-2 text-sm text-slate-600">Welcome, {user.username}.</p>
          </div>
          <Image
            src="/todrod-echo-bootcamp-logo.png"
            alt="Todrod Echo Bootcamp logo"
            width={180}
            height={180}
            className="h-auto w-32 sm:w-40"
            priority
          />
        </div>
        {inProgress ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <p>
              In-progress attempt found ({inProgress.mode}) • Remaining:
              {remainingSeconds === null ? " untimed" : ` ${Math.max(0, Math.floor(remainingSeconds / 60))} min`}
            </p>
            <Link href={`/exam/session/${inProgress.id}`} className="mt-2 inline-block rounded-lg bg-cyan-700 px-3 py-1 text-white">
              Resume
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href="/exam/full/setup" className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Full Exam Mode</h2>
          <p className="mt-2 text-sm text-slate-600">170 questions, weighted by category, no feedback until completion.</p>
        </Link>
        <Link href="/exam/practice/setup" className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Practice Mode</h2>
          <p className="mt-2 text-sm text-slate-600">Choose count, categories, timing and weighting behavior.</p>
        </Link>
        <Link href="/exam/stats" className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Your Stats</h2>
          <p className="mt-2 text-sm text-slate-600">Track progress, weak categories, and recent outcomes.</p>
        </Link>
        <Link href="/exam/admin" className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Admin-lite</h2>
          <p className="mt-2 text-sm text-slate-600">Import data, tune weights, and edit tags/explanations.</p>
        </Link>
      </div>
    </main>
  );
}
