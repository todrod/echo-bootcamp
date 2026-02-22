import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const parsed = loginSchema.parse(await req.json());

    let user = await prisma.user.findUnique({ where: { username: parsed.username } });
    if (!user && parsed.createIfMissing) {
      user = await prisma.user.create({
        data: {
          username: parsed.username,
          passwordHash: await hashPassword(parsed.password),
          isAdmin: false,
        },
      });
    }

    if (!user) return fail("User not found", 404);

    const isValid = await verifyPassword(parsed.password, user.passwordHash);
    if (!isValid) return fail("Invalid credentials", 401);

    await setSessionCookie(user.id);

    return ok({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch {
    return fail("Invalid request", 400);
  }
}
