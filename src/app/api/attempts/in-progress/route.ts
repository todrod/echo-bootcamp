import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { computeRemainingSeconds, expireAttemptIfNeeded } from "@/lib/exam";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  const latest = await prisma.attempt.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (!latest) return fail("No in-progress attempt", 404);

  const updated = await expireAttemptIfNeeded(latest.id);
  if (!updated || updated.status !== "IN_PROGRESS") {
    return ok({ inProgress: null });
  }

  const remainingSeconds = updated.timed
    ? computeRemainingSeconds(updated.startedAt, updated.timeLimitMinutes)
    : null;

  return ok({
    inProgress: {
      id: updated.id,
      mode: updated.mode,
      totalQuestions: updated.totalQuestions,
      remainingSeconds,
    },
  });
}
