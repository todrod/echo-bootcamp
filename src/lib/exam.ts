import { AttemptMode, AttemptStatus, CategoryCode, ExamTrack, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCategoryLabels } from "@/lib/examTracks";

export const DEFAULT_WEIGHTS: Record<CategoryCode, number> = {
  A: 0.1,
  B: 0.25,
  C: 0.2,
  D: 0.3,
  E: 0.15,
};

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function normalizeLabelsCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((label) => label.trim().toUpperCase())
    .filter((label): label is string => Boolean(label))
    .sort();
}

function sameAnswerSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((label, idx) => label === b[idx]);
}

function roundRobinFill(deficit: number, pools: Map<CategoryCode, number[]>, used = new Set<number>()) {
  const extra: number[] = [];
  const leftovers = Array.from(pools.values()).flat().filter((id) => !used.has(id));
  shuffle(leftovers);
  for (const id of leftovers) {
    if (extra.length >= deficit) break;
    used.add(id);
    extra.push(id);
  }
  return extra;
}

export async function getWeightsMap() {
  const existing = await prisma.weight.findMany();
  const map = { ...DEFAULT_WEIGHTS };
  existing.forEach((w) => {
    map[w.categoryCode] = w.weight;
  });
  return map;
}

async function questionPools(examTrack: ExamTrack, categories?: CategoryCode[]) {
  const where: Prisma.QuestionWhereInput = categories?.length
    ? { examTrack, category: { in: categories } }
    : { examTrack, category: { in: ["A", "B", "C", "D", "E"] } };

  const questions = await prisma.question.findMany({
    where,
    select: { id: true, category: true },
  });

  const pools = new Map<CategoryCode, number[]>();
  ["A", "B", "C", "D", "E"].forEach((c) => pools.set(c as CategoryCode, []));

  questions.forEach((q) => {
    if (q.category) {
      pools.get(q.category)?.push(q.id);
    }
  });

  for (const [, ids] of pools) {
    shuffle(ids);
  }

  return pools;
}

export async function sampleQuestionIds(opts: {
  total: number;
  mode: AttemptMode;
  examTrack: ExamTrack;
  categories?: CategoryCode[];
  useWeighting: boolean;
}) {
  const pools = await questionPools(opts.examTrack, opts.categories);
  const selected = new Set<number>();
  const warnings: string[] = [];

  if (opts.mode === "FULL" || opts.useWeighting) {
    const weights = await getWeightsMap();
    const activeCategories = opts.categories?.length
      ? opts.categories
      : (Object.keys(weights) as CategoryCode[]);

    let allocated = 0;
    for (const category of activeCategories) {
      const pool = pools.get(category) ?? [];
      const target = Math.floor(opts.total * (weights[category] ?? 0));
      const take = Math.min(target, pool.length);
      if (take < target) {
        warnings.push(`Category ${category} short by ${target - take}; filled from remaining pool.`);
      }
      for (let i = 0; i < take; i += 1) {
        selected.add(pool[i]);
      }
      allocated += take;
    }

    const deficit = opts.total - allocated;
    if (deficit > 0) {
      roundRobinFill(deficit, pools, selected).forEach((id) => selected.add(id));
    }
  } else {
    const all = Array.from(pools.values()).flat();
    shuffle(all);
    all.slice(0, opts.total).forEach((id) => selected.add(id));
  }

  const ordered = shuffle(Array.from(selected));
  return { ids: ordered.slice(0, opts.total), warnings };
}

export function computeRemainingSeconds(startedAt: Date, timeLimitMinutes: number | null) {
  if (!timeLimitMinutes) return null;
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  return timeLimitMinutes * 60 - elapsed;
}

export async function expireAttemptIfNeeded(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status !== "IN_PROGRESS" || !attempt.timed) return attempt;

  const remaining = computeRemainingSeconds(attempt.startedAt, attempt.timeLimitMinutes);
  if (remaining !== null && remaining <= 0) {
    await finalizeAttempt(attemptId, true);
    return prisma.attempt.findUnique({ where: { id: attemptId } });
  }

  return attempt;
}

export async function finalizeAttempt(attemptId: string, expired = false) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("Attempt not found");

  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, selectedLabels: true },
  });

  const correct = await prisma.correctAnswer.findMany({
    where: { questionId: { in: answers.map((a) => a.questionId) } },
    select: { questionId: true, correctLabels: true },
  });
  const answerMap = new Map(correct.map((c) => [c.questionId, normalizeLabelsCsv(c.correctLabels)]));

  await prisma.$transaction(
    answers.map((a) =>
      prisma.attemptAnswer.update({
        where: { attemptId_questionId: { attemptId, questionId: a.questionId } },
        data: {
          isCorrect: sameAnswerSet(
            normalizeLabelsCsv(a.selectedLabels),
            answerMap.get(a.questionId) ?? [],
          ),
        },
      }),
    ),
  );

  return prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: expired ? AttemptStatus.EXPIRED : AttemptStatus.FINISHED,
      finishedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
}

export async function getAttemptResults(attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      attemptQuestions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              choices: { orderBy: { label: "asc" } },
              attemptAnswer: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error("Attempt not found");

  const ids = attempt.attemptQuestions.map((aq) => aq.questionId);
  const categoryLabels = getCategoryLabels(attempt.examTrack);
  const corrects = await prisma.correctAnswer.findMany({
    where: { questionId: { in: ids } },
  });
  const correctMap = new Map(corrects.map((c) => [c.questionId, normalizeLabelsCsv(c.correctLabels)]));

  const categoryTotals = new Map<string, { total: number; correct: number }>();
  let totalCorrect = 0;

  const review = attempt.attemptQuestions.map((aq) => {
    const answer = attempt.answers.find((a) => a.questionId === aq.questionId);
    const correctLabels = correctMap.get(aq.questionId) ?? [];
    const userAnswerLabels = normalizeLabelsCsv(answer?.selectedLabels);
    const isCorrect = sameAnswerSet(userAnswerLabels, correctLabels);
    const category = aq.question.category ?? "A";

    if (!categoryTotals.has(category)) categoryTotals.set(category, { total: 0, correct: 0 });
    const entry = categoryTotals.get(category)!;
    entry.total += 1;
    if (isCorrect) {
      entry.correct += 1;
      totalCorrect += 1;
    }

    return {
      orderIndex: aq.orderIndex,
      questionId: aq.questionId,
      stem: aq.question.stem,
      category,
      difficulty: aq.question.difficulty,
      explanation: aq.question.explanation,
      choices: aq.question.choices,
      userAnswer: userAnswerLabels,
      correctLabels,
      markedForReview: answer?.markedForReview ?? false,
      isCorrect,
    };
  });

  const categoryBreakdown = Array.from(categoryTotals.entries()).map(([category, values]) => ({
    category,
    label: categoryLabels[category as CategoryCode],
    ...values,
    percent: values.total ? Math.round((values.correct / values.total) * 100) : 0,
  })).sort((a, b) => a.percent - b.percent);

  const weakestCategories = categoryBreakdown.slice(0, 3);

  const globalMissed = await prisma.attemptAnswer.groupBy({
    by: ["questionId"],
    where: {
      isCorrect: false,
      attempt: {
        userId: attempt.userId,
        status: { in: [AttemptStatus.FINISHED, AttemptStatus.EXPIRED] },
      },
    },
    _count: { questionId: true },
    orderBy: { _count: { questionId: "desc" } },
    take: 10,
  });

  const missedQuestionIds = globalMissed.map((g) => g.questionId);
  const missedQuestions = await prisma.question.findMany({
    where: { id: { in: missedQuestionIds } },
    select: { id: true, stem: true },
  });
  const missedMap = new Map(missedQuestions.map((q) => [q.id, q.stem]));

  return {
    attempt,
    totalCorrect,
    percent: attempt.totalQuestions ? Math.round((totalCorrect / attempt.totalQuestions) * 100) : 0,
    categoryBreakdown,
    weakestCategories,
    review,
    missedMost: globalMissed.map((m) => ({
      questionId: m.questionId,
      misses: m._count.questionId,
      stem: missedMap.get(m.questionId) ?? "",
    })),
  };
}
