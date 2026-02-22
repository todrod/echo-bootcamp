import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "eb_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";

type SessionPayload = {
  userId: number;
  exp: number;
};

function mustGetSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", mustGetSecret()).update(payload).digest("hex");
}

function encodeSession(payload: SessionPayload) {
  const raw = `${payload.userId}.${payload.exp}`;
  return `${raw}.${signPayload(raw)}`;
}

function decodeSession(value: string | undefined | null): SessionPayload | null {
  if (!value) return null;
  const [userIdRaw, expRaw, sig] = value.split(".");
  if (!userIdRaw || !expRaw || !sig) return null;

  const raw = `${userIdRaw}.${expRaw}`;
  const expected = signPayload(raw);
  if (sig.length !== expected.length) return null;
  const validSig = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!validSig) return null;

  const userId = Number(userIdRaw);
  const exp = Number(expRaw);
  if (!Number.isInteger(userId) || !Number.isInteger(exp)) return null;
  if (Date.now() > exp * 1000) return null;

  return { userId, exp };
}

export async function setSessionCookie(userId: number) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = encodeSession({ userId, exp });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  if (AUTH_DISABLED) {
    const existing = await prisma.user.findUnique({
      where: { username: "local_admin" },
      select: { id: true, username: true, isAdmin: true },
    });
    if (existing) {
      if (!existing.isAdmin) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { isAdmin: true },
        });
      }
      return { ...existing, isAdmin: true };
    }

    try {
      return await prisma.user.create({
        data: {
          username: "local_admin",
          passwordHash: await hashPassword("disabled-auth"),
          isAdmin: true,
        },
        select: { id: true, username: true, isAdmin: true },
      });
    } catch {
      return prisma.user.findUnique({
        where: { username: "local_admin" },
        select: { id: true, username: true, isAdmin: true },
      });
    }
  }

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const session = decodeSession(token);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, isAdmin: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/exam/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new Error("Admin access required");
  }
  return user;
}

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
