import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireAttemptIfNeeded } from "@/lib/exam";
import { SessionClient } from "@/components/SessionClient";
import { getExamTrackLabel } from "@/lib/examTracks";

export default async function SessionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();

  const checked = await expireAttemptIfNeeded(attemptId);
  if (!checked) notFound();
  if (checked.userId !== user.id) notFound();
  if (checked.status !== "IN_PROGRESS") {
    redirect(`/exam/results/${attemptId}`);
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      attemptQuestions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              choices: { orderBy: { label: "asc" } },
              correctAnswer: true,
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) notFound();

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  const questions = attempt.attemptQuestions.map((aq) => ({
    questionId: aq.questionId,
    orderIndex: aq.orderIndex,
    stem: aq.question.stem,
    choices: aq.question.choices,
    selectedLabels: (answerMap.get(aq.questionId)?.selectedLabels ?? "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
    isMultiSelect:
      (aq.question.correctAnswer?.correctLabels ?? "")
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean).length > 1,
    markedForReview: answerMap.get(aq.questionId)?.markedForReview ?? false,
  }));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <SessionClient
        attemptId={attempt.id}
        timed={attempt.timed}
        totalQuestions={attempt.totalQuestions}
        timeLimitMinutes={attempt.timeLimitMinutes}
        startedAt={attempt.startedAt.toISOString()}
        lastViewedQuestionIndex={attempt.lastViewedQuestionIndex}
        examTrack={attempt.examTrack}
        examTrackLabel={getExamTrackLabel(attempt.examTrack)}
        questions={questions}
      />
    </main>
  );
}
