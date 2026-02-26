import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { expireAttemptIfNeeded } from "@/lib/exam";
import { prisma } from "@/lib/prisma";
import { answerSchema } from "@/lib/validation";

function toCsv(labels: string[] | undefined | null) {
  if (!labels?.length) return null;
  const unique = Array.from(new Set(labels.map((label) => label.trim().toUpperCase())))
    .filter(Boolean)
    .sort();
  return unique.length ? unique.join(",") : null;
}

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
      selectedLabels: toCsv(parsed.selectedChoices ?? (parsed.selectedChoice ? [parsed.selectedChoice] : [])),
      markedForReview: parsed.markedForReview ?? undefined,
      answeredAt:
        (parsed.selectedChoices?.length ?? 0) > 0 || parsed.selectedChoice ? new Date() : null,
    },
    create: {
      attemptId: id,
      questionId: parsed.questionId,
      selectedLabels: toCsv(parsed.selectedChoices ?? (parsed.selectedChoice ? [parsed.selectedChoice] : [])),
      markedForReview: parsed.markedForReview ?? false,
      answeredAt:
        (parsed.selectedChoices?.length ?? 0) > 0 || parsed.selectedChoice ? new Date() : null,
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
