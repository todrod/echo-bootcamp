const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeText(value) {
  return String(value || '').replace(/\u007f/g, ' ').replace(/\s+/g, ' ').trim();
}
function toTag(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
function acsCategoryFromTitle(title) {
  const domain = String(title || '').split('|')[0].trim();
  if (domain.includes('Valvular')) return 'C';
  if (domain.includes('Advanced Imaging') || domain.includes('Structural')) return 'B';
  if (domain.includes('Right Heart') || domain.includes('Congenital')) return 'D';
  if (domain.includes('Quality')) return 'E';
  return 'A';
}
function acsDifficultyFromTitle(title) {
  const text = String(title || '').toLowerCase();
  if (text.includes('congenital') || text.includes('structural') || text.includes('interventional')) return 'HARD';
  if (text.includes('advanced') || text.includes('integration') || text.includes('valvular')) return 'MEDIUM';
  return 'EASY';
}
function extractExplanation(raw) {
  const rationaleMatch = String(raw || '').match(/Rationale:\s*([\s\S]*?)(?:Pearls:|$)/i);
  const pearlsMatch = String(raw || '').match(/Pearls:\s*([\s\S]*)$/i);
  const chunks = [rationaleMatch?.[1], pearlsMatch?.[1]].filter(Boolean).map(normalizeText);
  return chunks.length ? chunks.join(' ') : null;
}

(async () => {
  const raw = JSON.parse(fs.readFileSync('data/acs_parsed_debug.json', 'utf8'));

  await prisma.attemptAnswer.deleteMany({ where: { question: { examTrack: 'ACS' } } });
  await prisma.attemptQuestion.deleteMany({ where: { question: { examTrack: 'ACS' } } });
  await prisma.correctAnswer.deleteMany({ where: { question: { examTrack: 'ACS' } } });
  await prisma.choice.deleteMany({ where: { question: { examTrack: 'ACS' } } });
  await prisma.questionTag.deleteMany({ where: { question: { examTrack: 'ACS' } } });
  await prisma.question.deleteMany({ where: { examTrack: 'ACS' } });

  for (const q of raw) {
    const id = 200000 + q.index;
    const domain = (q.title || '').split('|')[0]?.trim() || 'Advanced Cardiac Sonographer';
    const topic = (q.title || '').split('|')[1]?.trim() || 'Clinical Scenario';
    const tags = [
      'acs',
      toTag(domain),
      toTag(topic),
      (q.correct || []).length > 1 ? 'multi-select' : 'single-best-answer',
    ].filter(Boolean);

    for (const code of tags) {
      await prisma.tag.upsert({ where: { code }, update: {}, create: { code, name: code } });
    }
    const allTags = await prisma.tag.findMany({ where: { code: { in: tags } } });

    await prisma.question.upsert({
      where: { id },
      update: {
        examTrack: 'ACS',
        stem: normalizeText(`${q.code}: ${q.title}\n\n${q.stem}`),
        explanation: extractExplanation(q.raw),
        category: acsCategoryFromTitle(q.title),
        difficulty: acsDifficultyFromTitle(q.title),
        tagConfidence: 0.9,
      },
      create: {
        id,
        examTrack: 'ACS',
        stem: normalizeText(`${q.code}: ${q.title}\n\n${q.stem}`),
        explanation: extractExplanation(q.raw),
        category: acsCategoryFromTitle(q.title),
        difficulty: acsDifficultyFromTitle(q.title),
        tagConfidence: 0.9,
      },
    });

    await prisma.choice.deleteMany({ where: { questionId: id } });
    await prisma.choice.createMany({
      data: (q.opts || []).map(([label, text]) => ({ questionId: id, label, text: normalizeText(text) })),
    });

    const correctLabels = Array.from(new Set(q.correct || [])).sort().join(',');
    if (correctLabels) {
      await prisma.correctAnswer.upsert({
        where: { questionId: id },
        update: { correctLabels },
        create: { questionId: id, correctLabels },
      });
    }

    await prisma.questionTag.deleteMany({ where: { questionId: id } });
    for (const t of allTags) {
      await prisma.questionTag.create({ data: { questionId: id, tagId: t.id, confidence: 0.9 } });
    }
  }

  const count = await prisma.question.count({ where: { examTrack: 'ACS' } });
  const breakdown = await prisma.question.groupBy({ by: ['category'], where: { examTrack: 'ACS' }, _count: { _all: true } });
  console.log('ACS reloaded:', count);
  console.log('ACS category breakdown:', breakdown);
  await prisma.$disconnect();
})();
