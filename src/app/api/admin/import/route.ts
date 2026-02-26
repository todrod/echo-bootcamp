import fs from "fs";
import path from "path";
import { CategoryCode, Difficulty, ExamTrack } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RscTaggedQuestion = {
  id: number;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctLabel?: "A" | "B" | "C" | "D";
  category: CategoryCode;
  difficulty: Difficulty;
  tagConfidence: number;
  tags: string[];
};

type AcsRawQuestion = {
  index: number;
  code: string;
  title: string;
  stem: string;
  opts: ["A" | "B" | "C" | "D" | "E", string][];
  correct: ("A" | "B" | "C" | "D" | "E")[];
  raw: string;
};

type ImportQuestion = {
  id: number;
  examTrack: ExamTrack;
  stem: string;
  explanation: string | null;
  choices: { label: "A" | "B" | "C" | "D" | "E"; text: string }[];
  correctLabels?: string;
  category: CategoryCode;
  difficulty: Difficulty;
  tagConfidence: number;
  tags: string[];
};

function normalizeText(value: string) {
  return value.replace(/\u007f/g, " ").replace(/\s+/g, " ").trim();
}

function toTag(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function acsCategoryFromTitle(title: string): CategoryCode {
  const domain = title.split("|")[0]?.trim() ?? "";
  if (domain.includes("Valvular")) return "C";
  if (domain.includes("Advanced Imaging") || domain.includes("Structural")) return "B";
  if (domain.includes("Right Heart") || domain.includes("Congenital")) return "D";
  if (domain.includes("Quality")) return "E";
  return "A";
}

function acsDifficultyFromTitle(title: string): Difficulty {
  const text = title.toLowerCase();
  if (text.includes("congenital") || text.includes("structural") || text.includes("interventional")) {
    return "HARD";
  }
  if (text.includes("advanced") || text.includes("integration") || text.includes("valvular")) {
    return "MEDIUM";
  }
  return "EASY";
}

function extractExplanation(raw: string): string | null {
  const rationaleMatch = raw.match(/Rationale:\s*([\s\S]*?)(?:Pearls:|$)/i);
  const pearlsMatch = raw.match(/Pearls:\s*([\s\S]*)$/i);
  const chunks = [rationaleMatch?.[1], pearlsMatch?.[1]]
    .filter((v): v is string => Boolean(v))
    .map((v) => normalizeText(v));
  if (!chunks.length) return null;
  return chunks.join(" ");
}

function loadRscQuestions(filePath: string): ImportQuestion[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as RscTaggedQuestion[];
  return raw.map((q) => ({
    id: q.id,
    examTrack: "RSC",
    stem: normalizeText(q.stem),
    explanation: null,
    choices: q.choices.map((c) => ({ ...c, text: normalizeText(c.text) })),
    correctLabels: q.correctLabel,
    category: q.category,
    difficulty: q.difficulty,
    tagConfidence: q.tagConfidence,
    tags: q.tags,
  }));
}

function loadAcsQuestions(filePath: string): ImportQuestion[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AcsRawQuestion[];
  return raw.map((q) => {
    const domain = q.title.split("|")[0]?.trim() ?? "Advanced Cardiac Sonographer";
    const topic = q.title.split("|")[1]?.trim() ?? "Clinical Scenario";
    const tags = [
      "acs",
      toTag(domain),
      toTag(topic),
      q.correct.length > 1 ? "multi-select" : "single-best-answer",
    ].filter(Boolean);

    return {
      id: 200000 + q.index,
      examTrack: "ACS",
      stem: normalizeText(`${q.code}: ${q.title}\n\n${q.stem}`),
      explanation: extractExplanation(q.raw),
      choices: q.opts.map(([label, text]) => ({ label, text: normalizeText(text) })),
      correctLabels: q.correct.length ? Array.from(new Set(q.correct)).sort().join(",") : undefined,
      category: acsCategoryFromTitle(q.title),
      difficulty: acsDifficultyFromTitle(q.title),
      tagConfidence: 0.9,
      tags,
    };
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (!user.isAdmin) return fail("Forbidden", 403);

  const body = (await req.json().catch(() => ({}))) as { examTrack?: "RSC" | "ACS" };
  const examTrack: ExamTrack = body.examTrack === "ACS" ? "ACS" : "RSC";

  const filePath =
    examTrack === "ACS"
      ? path.resolve("data/acs_parsed_debug.json")
      : path.resolve("data/questions.tagged.json");

  if (!fs.existsSync(filePath)) return fail(`Missing ${path.relative(process.cwd(), filePath)}`, 404);

  const questions = examTrack === "ACS" ? loadAcsQuestions(filePath) : loadRscQuestions(filePath);
  const tagCodes = [...new Set(questions.flatMap((q) => q.tags))];

  for (const code of tagCodes) {
    await prisma.tag.upsert({ where: { code }, update: {}, create: { code, name: code } });
  }
  const tags = await prisma.tag.findMany();
  const tagMap = new Map(tags.map((t) => [t.code, t.id]));

  for (const q of questions) {
    await prisma.$transaction(async (tx) => {
      await tx.question.upsert({
        where: { id: q.id },
        update: {
          examTrack: q.examTrack,
          stem: q.stem,
          explanation: q.explanation,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
        },
        create: {
          id: q.id,
          examTrack: q.examTrack,
          stem: q.stem,
          explanation: q.explanation,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
        },
      });

      await tx.choice.deleteMany({ where: { questionId: q.id } });
      await tx.choice.createMany({
        data: q.choices.map((c) => ({ questionId: q.id, label: c.label, text: c.text })),
      });

      if (q.correctLabels) {
        await tx.correctAnswer.upsert({
          where: { questionId: q.id },
          update: { correctLabels: q.correctLabels },
          create: { questionId: q.id, correctLabels: q.correctLabels },
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

  return ok({ imported: questions.length, examTrack });
}
