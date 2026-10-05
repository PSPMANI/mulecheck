"use server";

import { prisma } from "@/lib/prisma";
import { hashValue, normalize, validate } from "@/lib/identifiers";
import { saveEvidence } from "@/lib/uploads";
import { requestMeta } from "@/lib/request";
import { getSettings } from "@/lib/settings";
import { SCAM_CATEGORIES, toAccountType, type IdentifierRow } from "@/lib/reportSchema";

export type ReportState = { ok?: boolean; error?: string; id?: string; filesSaved?: number; filesRejected?: string[] };

const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();

/** Read a repeatable group: kind[] and value[] arrays submitted by the form. */
function rows(fd: FormData, group: string): IdentifierRow[] {
  const kinds = fd.getAll(`${group}_kind`).map((x) => x.toString());
  const values = fd.getAll(`${group}_value`).map((x) => x.toString().trim());
  const out: IdentifierRow[] = [];
  for (let i = 0; i < values.length; i++) if (values[i]) out.push({ kind: kinds[i] ?? "", value: values[i] });
  return out;
}

export async function submitReport(_prev: ReportState, fd: FormData): Promise<ReportState> {
  if (str(fd, "website_url_hp")) return { ok: true }; // honeypot
  if (!(await getSettings()).reportsOpen) return { error: "Reports are paused by the admin right now. Please try again later or call 1930." };

  const category = str(fd, "category");
  const scamName = str(fd, "scamName");
  const description = str(fd, "description");
  const amount = Math.max(0, parseInt(str(fd, "amount") || "0", 10) || 0);
  const reporterName = str(fd, "reporterName") || null;
  const reporterPhone = str(fd, "reporterPhone") || null;
  const reporterEmail = str(fd, "reporterEmail") || null;

  if (!SCAM_CATEGORIES.some((c) => c.key === category)) return { error: "Choose the type of scam." };
  if (category === "OTHER" && !scamName) return { error: "You chose Other. Please mention the name of the fraud or scam." };

  const payments = rows(fd, "pay");
  const links = rows(fd, "link");
  const contacts = rows(fd, "contact");
  const groups = rows(fd, "group").map((g) => ({ kind: "GROUP", value: g.value }));
  if (payments.length === 0) return { error: "Enter at least one UPI ID or bank account number." };

  // Normalize and validate every identifier.
  const all: { type: string; value: string; kind: string }[] = [];
  for (const r of [...payments, ...links, ...contacts, ...groups]) {
    const type = toAccountType(r.kind);
    const value = normalize(type, r.value);
    const problem = validate(type, value);
    if (problem) return { error: `${r.value}: ${problem}` };
    if (!all.some((a) => a.type === type && a.value === value)) all.push({ type, value, kind: r.kind });
  }
  if (description.length < 20) return { error: "Please describe what happened in a few sentences (at least 20 characters)." };
  if (description.length > 6000) return { error: "Description is too long (6000 characters max)." };
  const hasFiles = fd.getAll("screenshots").some((f) => typeof f === "object" && f !== null && (f as File).size > 0);
  if (!hasFiles) return { error: "Please attach screenshots of the pages or chat history." };

  const { ipHash, userAgent } = await requestMeta();
  const recent = await prisma.report.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (recent >= 10) return { error: "Too many reports from this connection. Try again later." };

  const summary = (scamName ? scamName + ". " : "") + description.replace(/\s+/g, " ").slice(0, 280);

  // Every identifier gets (or updates) an Account row, pending until a moderator approves. The first payment identifier is the primary.
  const accountIds: string[] = [];
  for (const a of all) {
    const valueHash = hashValue(a.value);
    const acc = await prisma.account.upsert({
      where: { type_valueHash: { type: a.type, valueHash } },
      create: {
        type: a.type,
        value: a.value,
        valueHash,
        scamType: category,
        role: a.type === "UPI" || a.type === "BANK" ? "MULE" : a.type === "WEBSITE" || a.type === "APP" ? "PHISHING" : "SCAMMER",
        summary,
        reportCount: 0,
        totalAmountInr: 0,
        status: "PENDING",
        visibility: "MASKED",
        source: "COMMUNITY",
        platform: a.kind === "GROUP" ? "Group link" : a.kind === "SOCIAL" ? "Telegram" : a.kind === "PHONE" ? "WhatsApp" : null,
      },
      update: { lastReported: new Date() },
    });
    accountIds.push(acc.id);
  }

  const report = await prisma.report.create({
    data: {
      accountId: accountIds[0],
      scamType: category,
      scamName: scamName || null,
      description,
      amountInr: amount,
      websiteUrl: links[0]?.value ?? null,
      reporterName,
      reporterEmail,
      reporterPhone,
      ipHash,
      userAgent,
      status: "PENDING",
      identifiers: {
        create: all.map((a, i) => ({ kind: a.kind, type: a.type, value: a.value, valueHash: hashValue(a.value), accountId: accountIds[i] })),
      },
    },
  });
  const files = await saveEvidence(fd, "screenshots", { reportId: report.id });
  return { ok: true, id: report.id, filesSaved: files.saved, filesRejected: files.rejected };
}
