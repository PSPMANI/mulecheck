import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { scamLabel, typeLabel, roleLabel } from "@/lib/scamTypes";

/**
 * Police / bank export: complete JSON dossier for one account.
 * Includes every report (approved or not), reporter contacts, evidence file metadata with SHA-256 hashes,
 * guidance requests that mentioned this identifier, comments and reactions.
 */
export async function GET(_req: Request, ctx: RouteContext<"/admin/export/[accountId]">) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const { accountId } = await ctx.params;
  const a = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      reactions: true,
    },
  });
  if (!a) return new NextResponse("Not found", { status: 404 });
  const reports = await prisma.report.findMany({
    where: { OR: [{ accountId }, { identifiers: { some: { accountId } } }] },
    include: { evidence: true, identifiers: true },
    orderBy: { createdAt: "asc" },
  });
  const advice = await prisma.adviceRequest.findMany({
    where: { OR: [{ matchedAccountId: a.id }, { identifierHash: a.valueHash }] },
    include: { evidence: true },
    orderBy: { createdAt: "asc" },
  });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const dossier = {
    generatedAt: new Date().toISOString(),
    generatedBy: "MuleCheck moderator export",
    account: {
      id: a.id,
      type: a.type,
      typeLabel: typeLabel(a.type),
      identifier: a.value,
      holderName: a.holderName,
      bankName: a.bankName,
      platform: a.platform,
      role: roleLabel(a.role),
      scamType: scamLabel(a.scamType),
      summary: a.summary,
      totalReportedLossInr: a.totalAmountInr,
      approvedReportCount: a.reportCount,
      firstReported: a.firstReported,
      lastReported: a.lastReported,
      exposedOn: a.exposedOn,
      status: a.status,
      publicVisibility: a.visibility,
      source: a.source,
      tags: a.tags,
      adminNotes: a.adminNotes,
      publicUrl: `${base}/exposure/${a.id}`,
    },
    reports: reports.map((r) => ({
      id: r.id,
      submittedAt: r.createdAt,
      moderationStatus: r.status,
      scamType: scamLabel(r.scamType),
      scamName: r.scamName,
      identifiers: r.identifiers.map((i) => ({ kind: i.kind, type: i.type, value: i.value, accountId: i.accountId })),
      description: r.description,
      amountLostInr: r.amountInr,
      incidentDateTimeIst: r.incidentDate,
      transactionReference: r.transactionRef,
      paymentMethod: r.paymentMethod,
      victimBank: r.victimBank,
      websiteUrl: r.websiteUrl,
      externalEvidenceUrl: r.evidenceUrl,
      reporter: { name: r.reporterName, email: r.reporterEmail, phone: r.reporterPhone, city: r.reporterCity },
      submissionMeta: { ipHash: r.ipHash, userAgent: r.userAgent },
      evidenceFiles: r.evidence.map((e) => ({
        id: e.id,
        kind: e.kind,
        originalName: e.originalName,
        mimeType: e.mimeType,
        sizeBytes: e.sizeBytes,
        sha256: e.sha256,
        uploadedAt: e.createdAt,
        downloadUrl: `${base}/admin/evidence/${e.id}`,
      })),
    })),
    guidanceRequests: advice.map((g) => ({
      id: g.id,
      submittedAt: g.createdAt,
      category: g.category,
      subject: g.subject,
      identifier: g.identifier,
      holderName: g.holderName,
      bankName: g.bankName,
      platform: g.platform,
      websiteUrl: g.websiteUrl,
      amountAskedInr: g.amountInr,
      description: g.description,
      requester: { name: g.contactName, email: g.contactEmail, phone: g.contactPhone },
      verdict: g.verdict,
      moderatorReply: g.adminReply,
      answeredAt: g.answeredAt,
      submissionMeta: { ipHash: g.ipHash, userAgent: g.userAgent },
      evidenceFiles: g.evidence.map((e) => ({ id: e.id, originalName: e.originalName, mimeType: e.mimeType, sizeBytes: e.sizeBytes, sha256: e.sha256, uploadedAt: e.createdAt })),
    })),
    publicComments: a.comments.map((c) => ({ at: c.createdAt, name: c.name, body: c.body, status: c.status, ipHash: c.ipHash })),
    reactions: a.reactions.reduce<Record<string, number>>((acc, r) => ((acc[r.emoji] = (acc[r.emoji] ?? 0) + 1), acc), {}),
  };
  return NextResponse.json(dossier, {
    headers: { "Content-Disposition": `attachment; filename="mulewatch-case-${a.type}-${a.value.replace(/[^\w.@-]/g, "_")}.json"` },
  });
}
