"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requestMeta } from "@/lib/request";
import { getSettings } from "@/lib/settings";

const REACTION_EMOJIS = ["😡", "⚠️", "💸", "🙏", "👍", "😢"] as const;

export type CommentState = { ok?: boolean; error?: string };

export async function addComment(_prev: CommentState, fd: FormData): Promise<CommentState> {
  if ((fd.get("website_url_hp")?.toString() ?? "").trim()) return { ok: true };
  const accountId = fd.get("accountId")?.toString() ?? "";
  const name = (fd.get("name")?.toString() ?? "").trim().slice(0, 60) || "Anonymous";
  const body = (fd.get("body")?.toString() ?? "").trim();
  if (!accountId) return { error: "Missing account." };
  if (!(await getSettings()).commentsOpen) return { error: "Comments are paused by the admin right now." };
  if (body.length < 2) return { error: "Write something first." };
  if (body.length > 1500) return { error: "Keep comments under 1500 characters." };
  const acc = await prisma.account.findUnique({ where: { id: accountId }, select: { status: true, visibility: true } });
  if (!acc || acc.status !== "APPROVED" || acc.visibility === "HIDDEN") return { error: "This post is not open for comments." };
  const { ipHash } = await requestMeta();
  const recent = await prisma.comment.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 600_000) } } });
  if (recent >= 5) return { error: "Slow down. Try again in a few minutes." };
  await prisma.comment.create({ data: { accountId, name, body, ipHash } });
  revalidatePath(`/exposure/${accountId}`);
  return { ok: true };
}

export async function toggleReaction(fd: FormData): Promise<void> {
  const accountId = fd.get("accountId")?.toString() ?? "";
  const emoji = fd.get("emoji")?.toString() ?? "";
  if (!accountId || !(REACTION_EMOJIS as readonly string[]).includes(emoji)) return;
  if (!(await getSettings()).commentsOpen) return;
  const { ipHash } = await requestMeta();
  const existing = await prisma.reaction.findUnique({ where: { accountId_emoji_ipHash: { accountId, emoji, ipHash } } });
  if (existing) await prisma.reaction.delete({ where: { id: existing.id } });
  else await prisma.reaction.create({ data: { accountId, emoji, ipHash } });
  revalidatePath(`/exposure/${accountId}`);
}
