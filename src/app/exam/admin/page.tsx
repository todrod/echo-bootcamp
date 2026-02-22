import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/exam");

  const [weights, questions] = await Promise.all([
    prisma.weight.findMany({ orderBy: { categoryCode: "asc" } }),
    prisma.question.findMany({
      select: {
        id: true,
        stem: true,
        category: true,
        difficulty: true,
        explanation: true,
        tagConfidence: true,
      },
      orderBy: { id: "asc" },
      take: 50,
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <AdminPanel weights={weights} questions={questions} />
    </main>
  );
}
