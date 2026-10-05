"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requestMeta } from "@/lib/request";
import { validateCommunityText, POST_VERDICTS } from "@/lib/moderation";
import { saveCommunityImages } from "@/lib/uploads";
import { ADVICE_CATEGORIES } from "@/lib/adviceCategories";
import { formValues, type Values } from "@/lib/formValues";
import { isAdmin } from "@/lib/auth";
import { touchAdminPresence } from "@/lib/presence";
import { getSettings, canPost, canReply, canReact } from "@/lib/settings";

export type PostState = { error?: string; values?: Values; n?: number };
export type ReplyState = { error?: string; ok?: boolean; values?: Values; n?: number };

const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();

export async function createPost(prev: PostState, fd: FormData): Promise<PostState> {
  const fail = (error: string): PostState => ({ error, values: formValues(fd), n: (prev.n ?? 0) + 1 });
  if (str(fd, "website_url_hp")) return {};
  const body = str(fd, "body");
  const admin = await isAdmin();
  const settings = await getSettings();
  if (!canPost(settings) && !admin) return fail(settings.communityOpen ? "New posts are paused by the admin right now." : settings.communityMessage);
  const authorName = admin ? "MuleCheck moderator" : str(fd, "authorName").slice(0, 60) || "Anonymous";
  const title = body.replace(/\s+/g, " ").slice(0, 120);
  const category = ADVICE_CATEGORIES.some((c) => c.key === str(fd, "category")) ? str(fd, "category") : "OTHER";
  const bErr = validateCommunityText(body, { min: 10, max: 4000 });
  if (bErr) return fail(bErr);
  const nErr = validateCommunityText(authorName, { min: 1, max: 60 });
  if (nErr) return fail("Name: " + nErr);

  const { ipHash, userAgent } = await requestMeta();
  const recent = await prisma.communityPost.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 5) return fail("You have posted a lot in the last hour. Please wait a bit.");

  const post = await prisma.communityPost.create({ data: { title, body, authorName, category, ipHash, userAgent, pinned: false } });
  const imgs = await saveCommunityImages(fd, "images", post.id);
  if (admin) await touchAdminPresence();
  revalidatePath("/community");
  redirect(`/community${imgs.rejected.length ? "?imgwarn=1" : ""}`);
}

export async function createReply(prev: ReplyState, fd: FormData): Promise<ReplyState> {
  const fail = (error: string): ReplyState => ({ error, values: formValues(fd), n: (prev.n ?? 0) + 1 });
  if (str(fd, "website_url_hp")) return { ok: true };
  const postId = str(fd, "postId");
  const body = str(fd, "body");
  const admin = await isAdmin();
  const settings = await getSettings();
  if (!canReply(settings) && !admin) return fail(settings.communityOpen ? "Replies are paused by the admin right now." : settings.communityMessage);
  const authorName = admin ? "MuleCheck moderator" : str(fd, "authorName").slice(0, 60) || "Anonymous";
  const verdictRaw = str(fd, "verdict");
  const verdict = POST_VERDICTS.some((v) => v.key === verdictRaw) ? verdictRaw : null;
  const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { status: true } });
  if (!post || post.status !== "VISIBLE") return fail("This post is closed.");
  const bErr = validateCommunityText(body, { min: 2, max: 2000 });
  if (bErr) return fail(bErr);
  const nErr = validateCommunityText(authorName, { min: 1, max: 60 });
  if (nErr) return fail("Name: " + nErr);

  const { ipHash } = await requestMeta();
  const recent = await prisma.communityReply.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 600_000) } } });
  if (recent >= 10) return fail("Slow down. Try again in a few minutes.");

  const reply = await prisma.$transaction(async (tx) => {
    const r = await tx.communityReply.create({ data: { postId, body, authorName, verdict, ipHash, isModerator: admin } });
    await tx.communityPost.update({ where: { id: postId }, data: { replyCount: { increment: 1 }, lastReplyAt: new Date() } });
    return r;
  });
  await saveCommunityImages(fd, "images", postId, reply.id);
  if (admin) await touchAdminPresence();
  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}

const POST_EMOJIS = ["🚨", "😡", "⚠️", "💸", "🙏", "👍", "😢", "🤔"];

export async function togglePostReaction(fd: FormData): Promise<void> {
  const postId = str(fd, "postId");
  const emoji = str(fd, "emoji");
  if (!postId || !POST_EMOJIS.includes(emoji)) return;
  if (!canReact(await getSettings())) return;
  const { ipHash } = await requestMeta();
  const existing = await prisma.postReaction.findUnique({ where: { postId_emoji_ipHash: { postId, emoji, ipHash } } });
  if (existing) await prisma.postReaction.delete({ where: { id: existing.id } });
  else await prisma.postReaction.create({ data: { postId, emoji, ipHash } });
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}
