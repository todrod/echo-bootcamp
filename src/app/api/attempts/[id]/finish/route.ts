import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { finalizeAttempt } from "@/lib/exam";
import { prisma } from "@/lib/prisma";
import { finishSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);

  const attempt = await prisma.attempt.findUnique({ where: { id } });
  if (!attempt || attempt.userId !== user.id) return fail("Attempt not found", 404);
  if (attempt.status !== "IN_PROGRESS") return ok({ status: attempt.status });

  let parsed;
  try {
    parsed = finishSchema.parse(await req.json());
  } catch {
    parsed = { forceExpire: false };
  }

  const finished = await finalizeAttempt(id, parsed.forceExpire ?? false);
  return ok({ status: finished.status });
}
