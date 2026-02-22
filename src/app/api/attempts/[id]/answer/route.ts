import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { expireAttemptIfNeeded } from "@/lib/exam";
import { prisma } from "@/lib/prisma";
import { answerSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const attempt = await expireAttemptIfNeeded(id);
  if (!attempt || attempt.userId !== user.id) return fail("Attempt not found", 404);
  if (attempt.status !== "IN_PROGRESS") return fail("Attempt is closed", 409);

  let parsed;
  try {
    parsed = answerSchema.parse(await req.json());
  } catch {
    return fail("Invalid payload", 400);
  }

  const attemptQuestion = await prisma.attemptQuestion.findUnique({
    where: {
      attemptId_questionId: {
        attemptId: id,
        questionId: parsed.questionId,
      },
    },
  });
  if (!attemptQuestion) return fail("Question not part of this attempt", 400);

  await prisma.attemptAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: id,
        questionId: parsed.questionId,
      },
    },
    update: {
      selectedLabel: parsed.selectedChoice ?? null,
      markedForReview: parsed.markedForReview ?? undefined,
      answeredAt: parsed.selectedChoice ? new Date() : null,
    },
    create: {
      attemptId: id,
      questionId: parsed.questionId,
      selectedLabel: parsed.selectedChoice ?? null,
      markedForReview: parsed.markedForReview ?? false,
      answeredAt: parsed.selectedChoice ? new Date() : null,
    },
  });

  await prisma.attempt.update({
    where: { id },
    data: {
      lastSeenAt: new Date(),
      lastViewedQuestionIndex: parsed.lastViewedQuestionIndex ?? attempt.lastViewedQuestionIndex,
    },
  });

  return ok({ success: true });
}
