import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { candidateHashes } from "@/lib/identifiers";

/** GET /api/check?q=<exact identifier> - exact-match lookup across all types. Returns the full record on a match. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  const rows = await prisma.account.findMany({
    where: { status: "APPROVED", OR: candidateHashes(q).map((c) => ({ type: c.type, valueHash: c.hash })) },
  });
  if (rows.length === 0) return NextResponse.json({ match: false });
  return NextResponse.json({
    match: true,
    items: rows.map((a) => ({
      id: a.id,
      type: a.type,
      identifier: a.value,
      holderName: a.holderName,
      bankName: a.bankName,
      platform: a.platform,
      role: a.role,
      scamType: a.scamType,
      reportCount: a.reportCount,
      totalAmountInr: a.totalAmountInr,
      lastReported: a.lastReported,
      summary: a.summary,
    })),
  });
}
