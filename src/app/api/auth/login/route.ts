import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { z } from "zod";

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = loginSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid login payload", 400);
    }
    return fail("Invalid request body", 400);
  }

  try {
    let user = await prisma.user.findUnique({ where: { username: parsed.username } });
    if (!user && parsed.createIfMissing) {
      user = await prisma.user.upsert({
        where: { username: parsed.username },
        update: {},
        create: {
          username: parsed.username,
          passwordHash: await hashPassword("username-only-login"),
          isAdmin: false,
        },
      });
    }

    if (!user) return fail("User not found", 404);

    await setSessionCookie(user.id);

    return ok({ user: { id: user.id, username: user.username, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error("[auth/login] failed:", error);
    return fail("Login failed", 500);
  }
}
