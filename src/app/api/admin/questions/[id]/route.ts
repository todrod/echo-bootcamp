import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { patchQuestionSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (!user.isAdmin) return fail("Forbidden", 403);

  const questionId = Number(id);
  if (!Number.isInteger(questionId) || questionId <= 0) return fail("Invalid question id", 400);

  let parsed;
  try {
    parsed = patchQuestionSchema.parse(await req.json());
  } catch {
    return fail("Invalid payload", 400);
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      category: parsed.category,
      difficulty: parsed.difficulty,
      explanation: parsed.explanation,
      tagConfidence: parsed.tagConfidence,
    },
  });

  if (parsed.tags) {
    for (const code of parsed.tags) {
      await prisma.tag.upsert({ where: { code }, update: {}, create: { code, name: code } });
    }
    const tags = await prisma.tag.findMany({ where: { code: { in: parsed.tags } } });
    await prisma.questionTag.deleteMany({ where: { questionId } });
    await prisma.questionTag.createMany({
      data: tags.map((tag) => ({
        questionId,
        tagId: tag.id,
        confidence: parsed.tagConfidence ?? updated.tagConfidence ?? 0.5,
      })),
    });
  }

  return ok({ question: updated });
}
