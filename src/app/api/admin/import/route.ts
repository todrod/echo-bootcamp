import fs from "fs";
import path from "path";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TaggedQuestion = {
  id: number;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctLabel?: "A" | "B" | "C" | "D";
  category: "A" | "B" | "C" | "D" | "E";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tagConfidence: number;
  tags: string[];
};

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (!user.isAdmin) return fail("Forbidden", 403);

  const filePath = path.resolve("data/questions.tagged.json");
  if (!fs.existsSync(filePath)) return fail("Missing data/questions.tagged.json", 404);

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TaggedQuestion[];
  const tagCodes = [...new Set(raw.flatMap((q) => q.tags))];

  for (const code of tagCodes) {
    await prisma.tag.upsert({ where: { code }, update: {}, create: { code, name: code } });
  }
  const tags = await prisma.tag.findMany();
  const tagMap = new Map(tags.map((t) => [t.code, t.id]));

  for (const q of raw) {
    await prisma.$transaction(async (tx) => {
      await tx.question.upsert({
        where: { id: q.id },
        update: {
          stem: q.stem,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
        },
        create: {
          id: q.id,
          stem: q.stem,
          explanation: null,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
        },
      });

      await tx.choice.deleteMany({ where: { questionId: q.id } });
      await tx.choice.createMany({
        data: q.choices.map((c) => ({ questionId: q.id, label: c.label, text: c.text })),
      });

      if (q.correctLabel) {
        await tx.correctAnswer.upsert({
          where: { questionId: q.id },
          update: { correctLabel: q.correctLabel },
          create: { questionId: q.id, correctLabel: q.correctLabel },
        });
      }

      await tx.questionTag.deleteMany({ where: { questionId: q.id } });
      await tx.questionTag.createMany({
        data: q.tags
          .map((code) => tagMap.get(code))
          .filter((id): id is number => Boolean(id))
          .map((tagId) => ({
            questionId: q.id,
            tagId,
            confidence: q.tagConfidence,
          })),
      });
    });
  }

  return ok({ imported: raw.length });
}
