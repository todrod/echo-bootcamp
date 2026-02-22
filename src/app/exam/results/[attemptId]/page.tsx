import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAttemptResults } from "@/lib/exam";
import { ResultsClient } from "@/components/ResultsClient";

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const data = await getAttemptResults(attemptId);

  if (data.attempt.userId !== user.id) notFound();

  const timeUsedMinutes = Math.max(
    0,
    Math.round((
      (data.attempt.finishedAt ?? new Date()).getTime() - data.attempt.startedAt.getTime()
    ) / 60000),
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <ResultsClient
        percent={data.percent}
        totalCorrect={data.totalCorrect}
        totalQuestions={data.attempt.totalQuestions}
        timeUsedMinutes={timeUsedMinutes}
        status={data.attempt.status}
        categoryBreakdown={data.categoryBreakdown}
        weakestCategories={data.weakestCategories}
        missedMost={data.missedMost}
        review={data.review}
      />
    </main>
  );
}
