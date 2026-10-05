import { prisma } from "./prisma";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function touchAdminPresence() {
  await prisma.presence.upsert({ where: { id: "admin" }, create: { id: "admin", lastSeen: new Date() }, update: { lastSeen: new Date() } });
}

export async function adminOnline(): Promise<boolean> {
  const p = await prisma.presence.findUnique({ where: { id: "admin" } });
  return !!p && Date.now() - p.lastSeen.getTime() < ONLINE_WINDOW_MS;
}
