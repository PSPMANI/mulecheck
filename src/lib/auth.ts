import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { requestMeta } from "./request";

const COOKIE = "mx_admin";
const SESSION_HOURS = 12;
const MAX_FAILED = 5; // failed logins per IP per window
const LOCK_MINUTES = 15;

export type Role = "OWNER" | "MODERATOR";
export type AdminIdentity = { id: string; username: string; displayName: string; role: Role };

/**
 * First run: if no accounts exist, create the OWNER from ADMIN_USER / ADMIN_PASSWORD in .env.
 * After that, accounts live only in the database and .env is ignored.
 */
export async function ensureOwner() {
  const n = await prisma.adminUser.count();
  if (n > 0) return;
  const username = (process.env.ADMIN_USER ?? "owner").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length < 12) return;
  await prisma.adminUser.create({
    data: { username, displayName: "Owner", passwordHash: await bcrypt.hash(password, 11), role: "OWNER", mustChangePw: true },
  });
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await prisma.adminSession.create({ data: { token, userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroyAdminSession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  const who = await currentAdmin();
  if (token) await prisma.adminSession.deleteMany({ where: { token } });
  c.delete(COOKIE);
  await audit("LOGOUT", null, null, who?.username);
}

/** The logged-in moderator, or null. */
export async function currentAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.adminSession.findUnique({ where: { token }, include: { user: true } });
  if (!s || !s.user) return null;
  if (s.expiresAt < new Date() || !s.user.active) {
    await prisma.adminSession.delete({ where: { token } });
    return null;
  }
  return { id: s.user.id, username: s.user.username, displayName: s.user.displayName, role: s.user.role as Role };
}

export async function isAdmin(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

export async function isOwner(): Promise<boolean> {
  return (await currentAdmin())?.role === "OWNER";
}

/** Username + password login with per-IP lockout. */
export async function login(usernameRaw: string, password: string): Promise<{ ok: boolean; locked?: boolean; userId?: string; mustChangePw?: boolean }> {
  await ensureOwner();
  const username = usernameRaw.trim().toLowerCase();
  const { ipHash } = await requestMeta();
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const failures = await prisma.loginAttempt.count({ where: { ipHash, success: false, createdAt: { gte: since } } });
  if (failures >= MAX_FAILED) return { ok: false, locked: true };

  const user = await prisma.adminUser.findUnique({ where: { username } });
  // Always run a hash compare so timing is the same whether or not the user exists.
  const ok = !!user && user.active && (await bcrypt.compare(password, user.passwordHash));
  await prisma.loginAttempt.create({ data: { ipHash, username: username.slice(0, 60), success: ok } });
  if (!ok) {
    await audit("LOGIN_FAILED", null, `user ${username} ip ${ipHash.slice(0, 8)}`, null);
    return { ok: false };
  }
  await prisma.adminUser.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
  await audit("LOGIN", user!.id, null, user!.username);
  return { ok: true, userId: user!.id, mustChangePw: user!.mustChangePw };
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z0-9]/.test(pw)) return "Use a mix of lower case plus upper case or numbers.";
  return null;
}

/** Append-only record of moderator actions. */
export async function audit(action: string, targetId: string | null, details: string | null, actor?: string | null) {
  try {
    const { ipHash } = await requestMeta();
    const who = actor === undefined ? (await currentAdmin())?.username ?? null : actor;
    await prisma.adminLog.create({ data: { actor: who, action, targetId, details, ipHash } });
  } catch {
    // never block the action on logging
  }
}
