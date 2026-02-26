import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAttemptResults } from "@/lib/exam";
import { ResultsClient } from "@/components/ResultsClient";
import { getCategoryLabels, getExamTrackLabel } from "@/lib/examTracks";

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

  const categoryLegend = Object.entries(getCategoryLabels(data.attempt.examTrack)).map(
    ([category, label]) => ({ category, label }),
  );

  return (
    <main className="mx-auto max-w-6xl p-6">
      <ResultsClient
        attemptId={data.attempt.id}
        mode={data.attempt.mode}
        examTrack={data.attempt.examTrack}
        examTrackLabel={getExamTrackLabel(data.attempt.examTrack)}
        percent={data.percent}
        totalCorrect={data.totalCorrect}
        totalQuestions={data.attempt.totalQuestions}
        timeUsedMinutes={timeUsedMinutes}
        status={data.attempt.status}
        categoryLegend={categoryLegend}
        categoryBreakdown={data.categoryBreakdown}
        weakestCategories={data.weakestCategories}
        missedMost={data.missedMost}
        review={data.review}
      />
    </main>
  );
}
