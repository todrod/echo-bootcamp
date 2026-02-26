import { SetupForm } from "@/components/SetupForm";
import { requireUser } from "@/lib/auth";

export default async function FullSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  await requireUser();
  const { track } = await searchParams;
  const initialExamTrack = track === "ACS" ? "ACS" : "RSC";
  return (
    <main className="mx-auto max-w-3xl p-6">
      <SetupForm mode="FULL" initialExamTrack={initialExamTrack} />
    </main>
  );
}
