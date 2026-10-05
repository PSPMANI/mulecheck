import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { displayValue } from "@/lib/identifiers";
import { PUBLIC_WHERE } from "@/lib/queries";
import { startOfDay, addDays, parseDay, dateKey } from "@/lib/format";

/** GET /api/exposure?date=YYYY-MM-DD (default today) - public daily feed. Respects per-record visibility. */
export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date");
  const day = (dateStr && parseDay(dateStr)) || startOfDay(new Date());
  const limit = Math.min(500, parseInt(req.nextUrl.searchParams.get("limit") ?? "200", 10) || 200);
  const all = req.nextUrl.searchParams.get("all") === "1";
  const rows = await prisma.account.findMany({
    where: all ? PUBLIC_WHERE : { ...PUBLIC_WHERE, exposedOn: { gte: day, lt: addDays(day, 1) } },
    orderBy: [{ exposedOn: "desc" }, { totalAmountInr: "desc" }],
    take: limit,
  });
  return NextResponse.json(
    {
      date: all ? null : dateKey(day),
      count: rows.length,
      items: rows.map((a) => ({
        id: a.id,
        type: a.type,
        identifier: displayValue(a),
        masked: a.visibility !== "FULL" && (a.type === "BANK" || a.type === "UPI"),
        holderName: a.holderName,
        bankName: a.bankName,
        platform: a.platform,
        role: a.role,
        scamType: a.scamType,
        summary: a.summary,
        reportCount: a.reportCount,
        totalAmountInr: a.totalAmountInr,
        exposedOn: a.exposedOn,
        tags: a.tags.split(",").filter(Boolean),
      })),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
