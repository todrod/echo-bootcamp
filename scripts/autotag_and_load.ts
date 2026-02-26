import fs from "fs";
import path from "path";
import { CategoryCode, Difficulty, PrismaClient } from "@prisma/client";

type RawQuestion = {
  id: number;
  stem: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctLabel?: "A" | "B" | "C" | "D";
};

type TaggedQuestion = RawQuestion & {
  category: CategoryCode;
  difficulty: Difficulty;
  tagConfidence: number;
  tags: string[];
};

const prisma = new PrismaClient();

const categoryKeywords: Record<CategoryCode, string[]> = {
  A: ["patient", "history", "consent", "safety", "prep", "vitals", "infection"],
  B: ["view", "apical", "parasternal", "subcostal", "acquisition", "image quality", "doppler"],
  C: ["mitral", "aortic", "tricuspid", "pulmonic", "regurg", "stenosis", "valve"],
  D: ["hemodynamic", "cardiac output", "anatomy", "physiology", "pathology", "chamber", "septum"],
  E: ["physics", "frequency", "aliasing", "nyquist", "gain", "instrumentation", "attenuation", "equation"],
};

const hardTerms = ["continuity equation", "bernoulli", "pressure half-time", "nyquist", "deceleration", "prosthetic"];
const mediumTerms = ["doppler", "gradient", "ejection fraction", "strain", "regurgitation"];

function normalizeText(text: string) {
  return text.toLowerCase();
}

function scoreCategory(stem: string, choices: string[]) {
  const source = `${stem} ${choices.join(" ")}`.toLowerCase();
  const scores = new Map<CategoryCode, number>();

  (Object.keys(categoryKeywords) as CategoryCode[]).forEach((category) => {
    let score = 0;
    for (const term of categoryKeywords[category]) {
      if (source.includes(term)) score += 1;
    }
    scores.set(category, score);
  });

  const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestScore] = ordered[0];
  const secondScore = ordered[1]?.[1] ?? 0;
  const confidence = Math.min(1, 0.4 + Math.max(0, bestScore - secondScore) * 0.15 + bestScore * 0.05);

  return { category: bestCategory, confidence: Number(confidence.toFixed(2)) };
}

function inferDifficulty(stem: string, choices: string[]): Difficulty {
  const source = normalizeText(`${stem} ${choices.join(" ")}`);
  const lengthScore = stem.length > 220 ? 1 : 0;
  const hardScore = hardTerms.reduce((acc, term) => (source.includes(term) ? acc + 1 : acc), 0);
  const mediumScore = mediumTerms.reduce((acc, term) => (source.includes(term) ? acc + 1 : acc), 0);

  const score = lengthScore + hardScore * 2 + mediumScore;
  if (score >= 4) return "HARD";
  if (score >= 2) return "MEDIUM";
  return "EASY";
}

function buildTags(category: CategoryCode, difficulty: Difficulty) {
  return [
    `category:${category}`,
    `difficulty:${difficulty.toLowerCase()}`,
  ];
}

function tagQuestions(raw: RawQuestion[]): TaggedQuestion[] {
  return raw.map((q) => {
    const { category, confidence } = scoreCategory(q.stem, q.choices.map((c) => c.text));
    const difficulty = inferDifficulty(q.stem, q.choices.map((c) => c.text));

    return {
      ...q,
      category,
      difficulty,
      tagConfidence: confidence,
      tags: buildTags(category, difficulty),
    };
  });
}

async function upsertTags(tagCodes: string[]) {
  for (const code of tagCodes) {
    await prisma.tag.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
      },
    });
  }
}

async function loadIntoDb(questions: TaggedQuestion[]) {
  const allTagCodes = [...new Set(questions.flatMap((q) => q.tags))];
  await upsertTags(allTagCodes);
  const tags = await prisma.tag.findMany();
  const tagMap = new Map(tags.map((t) => [t.code, t.id]));

  for (const q of questions) {
    await prisma.$transaction(async (tx) => {
      await tx.question.upsert({
        where: { id: q.id },
        update: {
          examTrack: "RSC",
          stem: q.stem,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
        },
        create: {
          id: q.id,
          examTrack: "RSC",
          stem: q.stem,
          category: q.category,
          difficulty: q.difficulty,
          tagConfidence: q.tagConfidence,
          explanation: null,
        },
      });

      await tx.choice.deleteMany({ where: { questionId: q.id } });
      await tx.choice.createMany({
        data: q.choices.map((c) => ({
          questionId: q.id,
          label: c.label,
          text: c.text,
        })),
      });

      if (q.correctLabel) {
        await tx.correctAnswer.upsert({
          where: { questionId: q.id },
          update: { correctLabels: q.correctLabel },
          create: { questionId: q.id, correctLabels: q.correctLabel },
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

  await prisma.weight.upsert({ where: { categoryCode: "A" }, update: { weight: 0.1 }, create: { categoryCode: "A", weight: 0.1 } });
  await prisma.weight.upsert({ where: { categoryCode: "B" }, update: { weight: 0.25 }, create: { categoryCode: "B", weight: 0.25 } });
  await prisma.weight.upsert({ where: { categoryCode: "C" }, update: { weight: 0.2 }, create: { categoryCode: "C", weight: 0.2 } });
  await prisma.weight.upsert({ where: { categoryCode: "D" }, update: { weight: 0.3 }, create: { categoryCode: "D", weight: 0.3 } });
  await prisma.weight.upsert({ where: { categoryCode: "E" }, update: { weight: 0.15 }, create: { categoryCode: "E", weight: 0.15 } });
}

async function main() {
  const rawPath = path.resolve("data/questions.raw.json");
  const taggedPath = path.resolve("data/questions.tagged.json");

  if (!fs.existsSync(rawPath)) {
    throw new Error(`Input not found: ${rawPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8")) as RawQuestion[];
  const tagged = tagQuestions(raw);
  fs.writeFileSync(taggedPath, JSON.stringify(tagged, null, 2), "utf-8");

  await loadIntoDb(tagged);
  console.log(`Tagged ${tagged.length} questions and loaded into DB`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
