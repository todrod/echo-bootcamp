import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getAttemptResults } from "@/lib/exam";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  const data = await getAttemptResults(id);
  if (data.attempt.userId !== user.id) return fail("Not found", 404);
  return ok(data);
}
