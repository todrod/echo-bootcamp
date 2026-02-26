const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const norm = (s) => String(s || "").replace(/\u007f/g, " ").replace(/\s+/g, " ").trim();
const tag = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
const cat = (title) => {
  const d = (title || "").split("|")[0] || "";
  if (d.includes("Valvular")) return "C";
  if (d.includes("Advanced Imaging") || d.includes("Structural")) return "B";
  if (d.includes("Right Heart") || d.includes("Congenital")) return "D";
  if (d.includes("Quality")) return "E";
  return "A";
};
const diff = (title) => {
  const x = (title || "").toLowerCase();
  if (x.includes("congenital") || x.includes("structural") || x.includes("interventional")) return "HARD";
  if (x.includes("advanced") || x.includes("integration") || x.includes("valvular")) return "MEDIUM";
  return "EASY";
};

(async () => {
  const raw = JSON.parse(fs.readFileSync("data/acs_parsed_debug.json", "utf8"));

  await prisma.attemptAnswer.deleteMany({ where: { question: { examTrack: "ACS" } } });
  await prisma.attemptQuestion.deleteMany({ where: { question: { examTrack: "ACS" } } });
  await prisma.correctAnswer.deleteMany({ where: { question: { examTrack: "ACS" } } });
  await prisma.choice.deleteMany({ where: { question: { examTrack: "ACS" } } });
  await prisma.questionTag.deleteMany({ where: { question: { examTrack: "ACS" } } });
  await prisma.question.deleteMany({ where: { examTrack: "ACS" } });

  for (const q of raw) {
    const id = 200000 + q.index;
    const domain = ((q.title || "").split("|")[0] || "ACS").trim();
    const topic = ((q.title || "").split("|")[1] || "Scenario").trim();
    const tags = ["acs", tag(domain), tag(topic), (q.correct || []).length > 1 ? "multi-select" : "single-best-answer"];

    for (const code of tags) {
      await prisma.tag.upsert({ where: { code }, update: {}, create: { code, name: code } });
    }
    const tagRows = await prisma.tag.findMany({ where: { code: { in: tags } } });

    await prisma.question.upsert({
      where: { id },
      update: {
        examTrack: "ACS",
        stem: norm(`${q.code}: ${q.title}\n\n${q.stem}`),
        explanation: null,
        category: cat(q.title),
        difficulty: diff(q.title),
        tagConfidence: 0.9,
      },
      create: {
        id,
        examTrack: "ACS",
        stem: norm(`${q.code}: ${q.title}\n\n${q.stem}`),
        explanation: null,
        category: cat(q.title),
        difficulty: diff(q.title),
        tagConfidence: 0.9,
      },
    });

    await prisma.choice.deleteMany({ where: { questionId: id } });
    await prisma.choice.createMany({
      data: (q.opts || []).map(([label, text]) => ({ questionId: id, label, text: norm(text) })),
    });

    const correct = Array.from(new Set(q.correct || [])).sort().join(",");
    if (correct) {
      await prisma.correctAnswer.upsert({
        where: { questionId: id },
        update: { correctLabels: correct },
        create: { questionId: id, correctLabels: correct },
      });
    }

    await prisma.questionTag.deleteMany({ where: { questionId: id } });
    for (const t of tagRows) {
      await prisma.questionTag.create({ data: { questionId: id, tagId: t.id, confidence: 0.9 } });
    }
  }

  const count = await prisma.question.count({ where: { examTrack: "ACS" } });
  console.log("ACS count:", count);
  await prisma.$disconnect();
})();
