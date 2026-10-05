"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { destroyAdminSession, isAdmin, isOwner, audit } from "@/lib/auth";
import { hashValue, normalize, validate } from "@/lib/identifiers";
import { ACCOUNT_TYPES, SCAM_TYPES, ROLES } from "@/lib/scamTypes";
import { parseDay } from "@/lib/format";
import { saveSettings, DEFAULTS } from "@/lib/settings";
import { TEXT_FIELDS } from "@/lib/siteText";

async function guard() {
  if (!(await isAdmin())) redirect("/admin/login");
}

async function ownerGuard() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isOwner())) redirect("/admin");
}

function done() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

/** Approve a report: increments account counters and publishes the account if not yet published. */
export async function approveReport(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const r = await prisma.report.findUnique({ where: { id }, include: { identifiers: true } });
  if (!r || r.status !== "PENDING") return;
  await audit("APPROVE_REPORT", id, `account ${r.accountId}`);
  const isDispute = r.description.startsWith("[DISPUTE");
  await prisma.report.update({ where: { id }, data: { status: "APPROVED" } });
  if (isDispute) {
    await prisma.account.update({ where: { id: r.accountId }, data: { visibility: "HIDDEN", adminNotes: "Dispute upheld" } });
    done();
    return;
  }
  // Publish every identifier named in the report. The loss amount is counted once, on the primary account.
  const targets = r.identifiers.length ? r.identifiers.map((i) => i.accountId).filter((x): x is string => !!x) : [r.accountId];
  for (const accId of [...new Set(targets)]) {
    const acc = await prisma.account.findUnique({ where: { id: accId }, select: { exposedOn: true } });
    if (!acc) continue;
    await prisma.account.update({
      where: { id: accId },
      data: {
        reportCount: { increment: 1 },
        totalAmountInr: { increment: accId === r.accountId ? r.amountInr : 0 },
        lastReported: new Date(),
        status: "APPROVED",
        exposedOn: acc.exposedOn ?? new Date(),
      },
    });
  }
  done();
}

export async function rejectReport(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const r = await prisma.report.update({ where: { id }, data: { status: "REJECTED" } });
  await audit("REJECT_REPORT", id, `account ${r.accountId}`);
  // If the account has no approved reports and no other pending ones, reject it too.
  const others = await prisma.report.count({ where: { accountId: r.accountId, status: { in: ["PENDING", "APPROVED"] } } });
  const acc = await prisma.account.findUnique({ where: { id: r.accountId } });
  if (acc && acc.status === "PENDING" && others === 0) {
    await prisma.account.update({ where: { id: acc.id }, data: { status: "REJECTED" } });
  }
  done();
}

export async function setVisibility(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const visibility = fd.get("visibility")!.toString();
  if (!["FULL", "MASKED", "HIDDEN"].includes(visibility)) return;
  await audit("SET_VISIBILITY", id, visibility);
  await prisma.account.update({ where: { id }, data: { visibility } });
  done();
}

export async function setStatus(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const status = fd.get("status")!.toString();
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return;
  const acc = await prisma.account.findUnique({ where: { id } });
  if (!acc) return;
  await audit("SET_STATUS", id, status);
  await prisma.account.update({
    where: { id },
    data: { status, exposedOn: status === "APPROVED" && !acc.exposedOn ? new Date() : acc.exposedOn },
  });
  done();
}

export async function reExposeToday(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  await prisma.account.update({ where: { id }, data: { exposedOn: new Date(), status: "APPROVED" } });
  done();
}

export async function updateAccount(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const s = (k: string) => fd.get(k)?.toString().trim() ?? "";
  await prisma.account.update({
    where: { id },
    data: {
      summary: s("summary") || undefined,
      bankName: s("bankName") || null,
      holderName: s("holderName") || null,
      platform: s("platform") || null,
      scamType: SCAM_TYPES.some((x) => x.key === s("scamType")) ? s("scamType") : undefined,
      role: ROLES.some((x) => x.key === s("role")) ? s("role") : undefined,
      tags: s("tags"),
      adminNotes: s("adminNotes") || null,
      totalAmountInr: s("totalAmountInr") ? parseInt(s("totalAmountInr"), 10) || 0 : undefined,
    },
  });
  done();
}

export async function deleteAccount(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  await audit("DELETE_ACCOUNT", id, null);
  await prisma.account.delete({ where: { id } });
  done();
}

export type AddState = { error?: string; ok?: boolean };

/** Moderator adds a verified account directly (published immediately). */
export async function addAccount(_prev: AddState, fd: FormData): Promise<AddState> {
  await guard();
  const s = (k: string) => fd.get(k)?.toString().trim() ?? "";
  const type = s("type");
  if (!ACCOUNT_TYPES.some((t) => t.key === type)) return { error: "Bad type" };
  const value = normalize(type, s("value"));
  const v = validate(type, value);
  if (v) return { error: v };
  if (!SCAM_TYPES.some((x) => x.key === s("scamType"))) return { error: "Bad scam type" };
  const valueHash = hashValue(value);
  const amount = parseInt(s("totalAmountInr") || "0", 10) || 0;
  const existing = await prisma.account.findUnique({ where: { type_valueHash: { type, valueHash } } });
  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { reportCount: { increment: 1 }, totalAmountInr: { increment: amount }, lastReported: new Date(), status: "APPROVED", exposedOn: existing.exposedOn ?? new Date() },
    });
  } else {
    await prisma.account.create({
      data: {
        type,
        value,
        valueHash,
        bankName: s("bankName") || null,
        holderName: s("holderName") || null,
        platform: s("platform") || null,
        scamType: s("scamType"),
        role: ROLES.some((x) => x.key === s("role")) ? s("role") : "MULE",
        summary: s("summary") || "Reported for fraud.",
        totalAmountInr: amount,
        reportCount: 1,
        status: "APPROVED",
        visibility: ["FULL", "MASKED", "HIDDEN"].includes(s("visibility")) ? s("visibility") : "MASKED",
        exposedOn: new Date(),
        source: "ADMIN",
        tags: s("tags"),
      },
    });
  }
  done();
  return { ok: true };
}

/** Bulk CSV import. Columns: type,value,scamType,role,summary,bankName,holderName,platform,amountInr,visibility,exposedOn,tags */
export async function importCsv(_prev: { error?: string; ok?: boolean; imported?: number; skipped?: string[] }, fd: FormData) {
  await guard();
  let text = fd.get("csv")?.toString() ?? "";
  const file = fd.get("file");
  if (file && typeof file === "object" && "text" in file && (file as File).size > 0) text = await (file as File).text();
  if (!text.trim()) return { error: "Paste CSV or choose a file." };
  const publish = fd.get("publish")?.toString() === "on";
  const defaultVisibility = fd.get("defaultVisibility")?.toString() || "MASKED";
  const { parseCsv } = await import("@/lib/csv");
  const rows = parseCsv(text);
  let imported = 0;
  const skipped: string[] = [];
  for (const r of rows) {
    const type = (r.type ?? "").toUpperCase();
    if (!ACCOUNT_TYPES.some((t) => t.key === type)) {
      skipped.push(`${r.value ?? "?"}: unknown type "${r.type}"`);
      continue;
    }
    const value = normalize(type, r.value ?? "");
    const v = validate(type, value);
    if (v) {
      skipped.push(`${r.value}: ${v}`);
      continue;
    }
    const scamType = (r.scamtype ?? r.scam_type ?? "OTHER").toUpperCase();
    const role = (r.role ?? "MULE").toUpperCase();
    const amount = parseInt(r.amountinr ?? r.amount ?? "0", 10) || 0;
    const visibility = (r.visibility ?? defaultVisibility).toUpperCase();
    const exposedOn = (r.exposedon && parseDay(r.exposedon)) || new Date();
    const valueHash = hashValue(value);
    const existing = await prisma.account.findUnique({ where: { type_valueHash: { type, valueHash } } });
    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { reportCount: { increment: 1 }, totalAmountInr: { increment: amount }, lastReported: new Date() },
      });
    } else {
      await prisma.account.create({
        data: {
          type,
          value,
          valueHash,
          scamType: SCAM_TYPES.some((x) => x.key === scamType) ? scamType : "OTHER",
          role: ROLES.some((x) => x.key === role) ? role : "MULE",
          summary: r.summary || r.description || "Reported for fraud.",
          bankName: r.bankname || null,
          holderName: r.holdername || null,
          platform: r.platform || null,
          totalAmountInr: amount,
          reportCount: parseInt(r.reportcount ?? "1", 10) || 1,
          visibility: ["FULL", "MASKED", "HIDDEN"].includes(visibility) ? visibility : "MASKED",
          status: publish ? "APPROVED" : "PENDING",
          exposedOn: publish ? exposedOn : null,
          source: "SEED",
          tags: r.tags ?? "",
        },
      });
    }
    imported++;
  }
  done();
  return { ok: true, imported, skipped };
}

/** Answer a guidance request. Optionally publish the identifier straight to the exposure board. */
export async function answerAdvice(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const verdict = fd.get("verdict")!.toString();
  const adminReply = (fd.get("adminReply")?.toString() ?? "").trim();
  if (!["SCAM", "SUSPICIOUS", "SAFE", "NEED_INFO"].includes(verdict)) return;
  if (!adminReply) return;
  await audit("ANSWER_ADVICE", id, verdict);
  const r = await prisma.adviceRequest.update({ where: { id }, data: { verdict, adminReply, status: "ANSWERED", answeredAt: new Date() } });

  if (fd.get("publish")?.toString() === "on" && verdict === "SCAM") {
    let type = r.identifierType;
    let rawValue = r.identifier;
    if (!rawValue && r.websiteUrl) {
      type = "WEBSITE";
      rawValue = r.websiteUrl;
    } else if (!rawValue && r.subject) {
      type = "APP";
      rawValue = r.subject;
    }
    if (!rawValue || !ACCOUNT_TYPES.some((t) => t.key === type)) {
      done();
      revalidatePath(`/advice/${r.token}`);
      return;
    }
    const value = normalize(type, rawValue);
    const valueHash = hashValue(value);
    const scamType = fd.get("scamType")?.toString() ?? "OTHER";
    const existing = await prisma.account.findUnique({ where: { type_valueHash: { type, valueHash } } });
    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { reportCount: { increment: 1 }, totalAmountInr: { increment: r.amountInr }, lastReported: new Date(), status: "APPROVED", exposedOn: existing.exposedOn ?? new Date() },
      });
    } else {
      await prisma.account.create({
        data: {
          type,
          value,
          valueHash,
          holderName: r.holderName,
          bankName: r.bankName,
          platform: r.platform,
          scamType: SCAM_TYPES.some((x) => x.key === scamType) ? scamType : "OTHER",
          role: "MULE",
          summary: r.description.slice(0, 280),
          totalAmountInr: r.amountInr,
          reportCount: 1,
          status: "APPROVED",
          visibility: "MASKED",
          exposedOn: new Date(),
          source: "ADMIN",
          tags: "from-guidance",
        },
      });
    }
  }
  done();
  revalidatePath(`/advice/${r.token}`);
}


export async function hideComment(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const status = fd.get("status")!.toString();
  if (!["VISIBLE", "HIDDEN"].includes(status)) return;
  const c = await prisma.comment.update({ where: { id }, data: { status } });
  revalidatePath(`/exposure/${c.accountId}`);
  revalidatePath("/admin");
}


export async function moderatePost(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  await audit("MODERATE_POST", id, fd.get("delete") ? "delete" : `${fd.get("status") ?? ""}${fd.get("pinned") ? " pin=" + fd.get("pinned") : ""}`);
  if (fd.get("delete")?.toString() === "1") {
    await prisma.communityPost.delete({ where: { id } });
  } else {
    const status = fd.get("status")?.toString();
    const pinned = fd.get("pinned")?.toString();
    await prisma.communityPost.update({
      where: { id },
      data: {
        ...(status && ["VISIBLE", "HIDDEN"].includes(status) ? { status } : {}),
        ...(pinned !== undefined && pinned !== null ? { pinned: pinned === "1" } : {}),
      },
    });
  }
  revalidatePath("/community");
  revalidatePath(`/community/${id}`);
  revalidatePath("/admin");
}

export async function moderateReply(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const status = fd.get("status")!.toString();
  if (!["VISIBLE", "HIDDEN"].includes(status)) return;
  const r = await prisma.communityReply.update({ where: { id }, data: { status } });
  revalidatePath(`/community/${r.postId}`);
  revalidatePath("/admin");
}

export async function moderatorReply(fd: FormData) {
  await guard();
  const postId = fd.get("postId")!.toString();
  const body = (fd.get("body")?.toString() ?? "").trim();
  const verdict = fd.get("verdict")?.toString() ?? null;
  if (body.length < 2) return;
  await prisma.$transaction([
    prisma.communityReply.create({ data: { postId, body, authorName: "MuleCheck moderator", verdict, isModerator: true } }),
    prisma.communityPost.update({ where: { id: postId }, data: { replyCount: { increment: 1 }, lastReplyAt: new Date() } }),
  ]);
  revalidatePath(`/community/${postId}`);
  revalidatePath("/community");
  revalidatePath("/admin");
}


export async function resolveFlag(fd: FormData) {
  await guard();
  const id = fd.get("id")!.toString();
  const action = fd.get("action")!.toString();
  const f = await prisma.flag.findUnique({ where: { id } });
  if (!f) return;
  await audit("RESOLVE_FLAG", id, `${action} ${f.targetType} ${f.targetId}`);
  if (action === "HIDE") {
    if (f.targetType === "POST") await prisma.communityPost.updateMany({ where: { id: f.targetId }, data: { status: "HIDDEN" } });
    if (f.targetType === "REPLY") await prisma.communityReply.updateMany({ where: { id: f.targetId }, data: { status: "HIDDEN" } });
    if (f.targetType === "COMMENT") await prisma.comment.updateMany({ where: { id: f.targetId }, data: { status: "HIDDEN" } });
  }
  await prisma.flag.updateMany({ where: { targetType: f.targetType, targetId: f.targetId, status: "OPEN" }, data: { status: action === "DISMISS" ? "DISMISSED" : "RESOLVED" } });
  revalidatePath("/community");
  revalidatePath("/admin");
}

export type SettingsState = { ok?: boolean; error?: string };

export async function updateSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await ownerGuard();
  const bool = (k: string) => fd.get(k)?.toString() === "on";
  const next = {
    communityOpen: bool("communityOpen"),
    communityPosts: bool("communityPosts"),
    communityReplies: bool("communityReplies"),
    communityReactions: bool("communityReactions"),
    commentsOpen: bool("commentsOpen"),
    reportsOpen: bool("reportsOpen"),
    adviceOpen: bool("adviceOpen"),
    communityMessage: (fd.get("communityMessage")?.toString() ?? "").trim().slice(0, 300) || DEFAULTS.communityMessage,
    announcement: (fd.get("announcement")?.toString() ?? "").trim().slice(0, 300),
  };
  await saveSettings(next);
  await audit("UPDATE_SETTINGS", null, JSON.stringify(next));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateSiteText(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await ownerGuard();
  const next: Record<string, string> = {};
  for (const f of TEXT_FIELDS) next[f.key] = (fd.get(f.key)?.toString() ?? "").trim().slice(0, 2000);
  await saveSettings(next);
  await audit("UPDATE_SITE_TEXT", null, Object.keys(next).length + " fields");
  revalidatePath("/", "layout");
  return { ok: true };
}
