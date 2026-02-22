import { AttemptStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const attempts = await prisma.attempt.findMany({
    where: {
      userId: user.id,
      status: { in: [AttemptStatus.FINISHED, AttemptStatus.EXPIRED] },
    },
    include: { answers: true },
    orderBy: { startedAt: "desc" },
  });

  if (!attempts.length) return fail("No finished attempts yet", 404);

  const summary = attempts.map((a) => {
    const correct = a.answers.filter((ans) => ans.isCorrect).length;
    return {
      id: a.id,
      mode: a.mode,
      status: a.status,
      percent: a.totalQuestions ? Math.round((correct / a.totalQuestions) * 100) : 0,
      correct,
      total: a.totalQuestions,
      startedAt: a.startedAt,
    };
  });

  const avgPercent = Math.round(summary.reduce((acc, s) => acc + s.percent, 0) / summary.length);

  return ok({
    totalAttempts: summary.length,
    avgPercent,
    attempts: summary.slice(0, 25),
  });
}
