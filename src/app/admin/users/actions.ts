"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { currentAdmin, hashPassword, passwordProblem, audit } from "@/lib/auth";

export type UserState = { ok?: boolean; error?: string; tempPassword?: string; username?: string };

const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();

async function owner() {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  if (me.role !== "OWNER") redirect("/admin");
  return me;
}

export async function createUser(_prev: UserState, fd: FormData): Promise<UserState> {
  await owner();
  const username = str(fd, "username").toLowerCase();
  const displayName = str(fd, "displayName") || username;
  const role = str(fd, "role") === "OWNER" ? "OWNER" : "MODERATOR";
  let password = str(fd, "password");
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: "User ID: 3 to 30 characters, letters, numbers, dot, dash or underscore." };
  if (await prisma.adminUser.findUnique({ where: { username } })) return { error: "That user ID already exists." };
  let generated = false;
  if (!password) {
    password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 54]).join("");
    generated = true;
  } else {
    const p = passwordProblem(password);
    if (p) return { error: p };
  }
  await prisma.adminUser.create({ data: { username, displayName, role, passwordHash: await hashPassword(password), mustChangePw: true } });
  await audit("CREATE_USER", null, `${username} (${role})`);
  revalidatePath("/admin");
  return { ok: true, username, tempPassword: generated ? password : undefined };
}

export async function setUserActive(fd: FormData) {
  const me = await owner();
  const id = str(fd, "id");
  const active = str(fd, "active") === "1";
  if (id === me.id) return;
  const u = await prisma.adminUser.update({ where: { id }, data: { active } });
  if (!active) await prisma.adminSession.deleteMany({ where: { userId: id } });
  await audit(active ? "ENABLE_USER" : "DISABLE_USER", id, u.username);
  revalidatePath("/admin");
}

export async function setUserRole(fd: FormData) {
  const me = await owner();
  const id = str(fd, "id");
  const role = str(fd, "role") === "OWNER" ? "OWNER" : "MODERATOR";
  if (id === me.id) return;
  const u = await prisma.adminUser.update({ where: { id }, data: { role } });
  await audit("SET_ROLE", id, `${u.username} -> ${role}`);
  revalidatePath("/admin");
}

export async function resetUserPassword(_prev: UserState, fd: FormData): Promise<UserState> {
  await owner();
  const id = str(fd, "id");
  const password = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 54]).join("");
  const u = await prisma.adminUser.update({ where: { id }, data: { passwordHash: await hashPassword(password), mustChangePw: true } });
  await prisma.adminSession.deleteMany({ where: { userId: id } });
  await audit("RESET_PASSWORD", id, u.username);
  revalidatePath("/admin");
  return { ok: true, username: u.username, tempPassword: password };
}

export async function deleteUser(fd: FormData) {
  const me = await owner();
  const id = str(fd, "id");
  if (id === me.id) return;
  const owners = await prisma.adminUser.count({ where: { role: "OWNER", active: true } });
  const u = await prisma.adminUser.findUnique({ where: { id } });
  if (!u) return;
  if (u.role === "OWNER" && owners <= 1) return;
  await prisma.adminUser.delete({ where: { id } });
  await audit("DELETE_USER", id, u.username);
  revalidatePath("/admin");
}

export async function changeOwnPassword(_prev: UserState, fd: FormData): Promise<UserState> {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  const current = str(fd, "current");
  const next = str(fd, "next");
  const repeat = str(fd, "repeat");
  const u = await prisma.adminUser.findUnique({ where: { id: me.id } });
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) return { error: "Current password is wrong." };
  if (next !== repeat) return { error: "The two new passwords do not match." };
  const p = passwordProblem(next);
  if (p) return { error: p };
  if (await bcrypt.compare(next, u.passwordHash)) return { error: "Choose a different password from the current one." };
  await prisma.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next), mustChangePw: false } });
  await audit("CHANGE_PASSWORD", me.id, null);
  redirect("/admin?pw=changed");
}
