import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized", 401);
  if (!user.isAdmin) return fail("Forbidden", 403);

  let parsed;
  try {
    parsed = weightSchema.parse(await req.json());
  } catch {
    return fail("Invalid payload", 400);
  }

  const total = parsed.weights.reduce((sum, w) => sum + w.weight, 0);
  if (Math.abs(total - 1) > 0.01) {
    return fail("Weights should sum to ~1.0", 400);
  }

  await prisma.$transaction(
    parsed.weights.map((w) =>
      prisma.weight.upsert({
        where: { categoryCode: w.categoryCode },
        update: { weight: w.weight },
        create: { categoryCode: w.categoryCode, weight: w.weight },
      }),
    ),
  );

  return ok({ success: true });
}
