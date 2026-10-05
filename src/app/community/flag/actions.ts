"use server";

import { prisma } from "@/lib/prisma";
import { requestMeta } from "@/lib/request";
import { FLAG_REASONS } from "@/lib/moderation";

export type FlagState = { ok?: boolean; error?: string };

export async function flagContent(_prev: FlagState, fd: FormData): Promise<FlagState> {
  const targetType = fd.get("targetType")?.toString() ?? "";
  const targetId = fd.get("targetId")?.toString() ?? "";
  const reason = fd.get("reason")?.toString() ?? "";
  const details = (fd.get("details")?.toString() ?? "").trim().slice(0, 500) || null;
  if (!["POST", "REPLY", "COMMENT"].includes(targetType) || !targetId) return { error: "Nothing to report." };
  if (!FLAG_REASONS.some((r) => r.key === reason)) return { error: "Pick a reason." };
  const { ipHash } = await requestMeta();
  const dup = await prisma.flag.findFirst({ where: { targetType, targetId, ipHash, status: "OPEN" } });
  if (dup) return { ok: true };
  const recent = await prisma.flag.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 20) return { error: "Too many reports from this connection." };
  await prisma.flag.create({ data: { targetType, targetId, reason, details, ipHash } });
  return { ok: true };
}
