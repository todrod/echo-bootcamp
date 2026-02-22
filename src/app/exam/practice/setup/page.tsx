import { SetupForm } from "@/components/SetupForm";
import { requireUser } from "@/lib/auth";

export default async function PracticeSetupPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-3xl p-6">
      <SetupForm mode="PRACTICE" />
    </main>
  );
}
