import { AttemptMode, CategoryCode } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAttemptSchema } from "@/lib/validation";
import { sampleQuestionIds } from "@/lib/exam";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  let parsed;
  try {
    parsed = createAttemptSchema.parse(await req.json());
  } catch {
    return fail("Invalid payload", 400);
  }

  const mode = parsed.mode as AttemptMode;
  const examTrack = parsed.examTrack;
  const total = mode === "FULL" ? 170 : parsed.count ?? 50;
  const categories = parsed.categories as CategoryCode[] | undefined;

  const existing = await prisma.attempt.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  if (existing) {
    if (existing.examTrack === examTrack && existing.mode === mode) {
      const existingQuestionCount = await prisma.attemptQuestion.count({
        where: { attemptId: existing.id },
      });
      const isStaleFull = mode === "FULL" && existingQuestionCount < 170;
      const isCorrupt = existingQuestionCount !== existing.totalQuestions || existingQuestionCount < 5;

      if (!isStaleFull && !isCorrupt) {
        return ok({ attemptId: existing.id, resumed: true });
      }

      await prisma.attempt.update({
        where: { id: existing.id },
        data: {
          status: "EXPIRED",
          finishedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    } else {
      return fail(
        `You already have an in-progress ${existing.examTrack} ${existing.mode.toLowerCase()} attempt. Resume or finish it first.`,
        409,
      );
    }
  }

  const timed = parsed.timerSetting !== "UNTIMED";
  const timeLimitMinutes =
    parsed.timerSetting === "UNTIMED"
      ? null
      : mode === "FULL"
        ? 180
        : parsed.timerSetting === "CUSTOM"
          ? parsed.timeLimitMinutes ?? 180
          : 180;

  const useWeighting =
    mode === "FULL"
      ? true
      : categories?.length
        ? false
        : parsed.useWeighting ?? true;

  const { ids, warnings } = await sampleQuestionIds({
    total,
    mode,
    examTrack,
    categories,
    useWeighting,
  });

  if (!ids.length) return fail("No questions available for selected settings", 400);

  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      mode,
      examTrack,
      totalQuestions: ids.length,
      timed,
      timeLimitMinutes,
      status: "IN_PROGRESS",
      useWeighting,
      categoriesJson: categories?.length ? JSON.stringify(categories) : null,
      attemptQuestions: {
        createMany: {
          data: ids.map((questionId, i) => ({ questionId, orderIndex: i })),
        },
      },
      answers: {
        createMany: {
          data: ids.map((questionId) => ({
            questionId,
            selectedLabels: null,
            isCorrect: null,
            markedForReview: false,
            answeredAt: null,
          })),
        },
      },
    },
  });

  warnings.forEach((w) => console.warn(`[attempt:create] ${w}`));

  return ok({ attemptId: attempt.id, warnings });
}
