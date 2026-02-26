import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const source = await prisma.attempt.findUnique({
    where: { id },
    include: {
      attemptQuestions: {
        orderBy: { orderIndex: "asc" },
        select: { questionId: true, orderIndex: true },
      },
    },
  });

  if (!source || source.userId !== user.id) return fail("Attempt not found", 404);
  if (source.status === "IN_PROGRESS") return fail("Finish current attempt before retrying", 409);

  const existing = await prisma.attempt.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    return ok({ attemptId: existing.id, resumed: true });
  }

  const cloned = await prisma.attempt.create({
    data: {
      userId: source.userId,
      mode: source.mode,
      examTrack: source.examTrack,
      totalQuestions: source.totalQuestions,
      timed: source.timed,
      timeLimitMinutes: source.timeLimitMinutes,
      status: "IN_PROGRESS",
      useWeighting: source.useWeighting,
      categoriesJson: source.categoriesJson,
      attemptQuestions: {
        createMany: {
          data: source.attemptQuestions.map((q) => ({
            questionId: q.questionId,
            orderIndex: q.orderIndex,
          })),
        },
      },
      answers: {
        createMany: {
          data: source.attemptQuestions.map((q) => ({
            questionId: q.questionId,
            selectedLabels: null,
            isCorrect: null,
            markedForReview: false,
            answeredAt: null,
          })),
        },
      },
    },
  });

  return ok({ attemptId: cloned.id, resumed: false });
}
