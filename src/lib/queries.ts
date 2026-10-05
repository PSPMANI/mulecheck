import { prisma } from "./prisma";
import { startOfDay, addDays, dateKey } from "./format";

export const PUBLIC_WHERE = { status: "APPROVED", visibility: { not: "HIDDEN" } } as const;

export async function getDailyExposure(day: Date) {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  return prisma.account.findMany({
    where: { ...PUBLIC_WHERE, exposedOn: { gte: from, lt: to } },
    orderBy: [{ totalAmountInr: "desc" }, { reportCount: "desc" }],
  });
}

export async function getStats() {
  const today = startOfDay(new Date());
  const [total, todayCount, mules, pending, amount, byType, byScam, recent] = await Promise.all([
    prisma.account.count({ where: PUBLIC_WHERE }),
    prisma.account.count({ where: { ...PUBLIC_WHERE, exposedOn: { gte: today } } }),
    prisma.account.count({ where: { ...PUBLIC_WHERE, role: "MULE" } }),
    prisma.account.count({ where: { status: "PENDING" } }),
    prisma.account.aggregate({ where: PUBLIC_WHERE, _sum: { totalAmountInr: true, reportCount: true } }),
    prisma.account.groupBy({ by: ["type"], where: PUBLIC_WHERE, _count: { _all: true } }),
    prisma.account.groupBy({
      by: ["scamType"],
      where: PUBLIC_WHERE,
      _count: { _all: true },
      _sum: { totalAmountInr: true },
    }),
    prisma.account.findMany({
      where: { ...PUBLIC_WHERE, exposedOn: { gte: addDays(today, -13) } },
      select: { exposedOn: true },
    }),
  ]);
  const series: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dateKey(addDays(today, -i));
    series.push({
      date: key,
      count: recent.filter((r) => r.exposedOn && dateKey(r.exposedOn) === key).length,
    });
  }
  return {
    total,
    todayCount,
    mules,
    pending,
    totalAmount: amount._sum.totalAmountInr ?? 0,
    totalReports: amount._sum.reportCount ?? 0,
    byType: byType.map((b) => ({ type: b.type, count: b._count._all })).sort((a, b) => b.count - a.count),
    byScam: byScam
      .map((b) => ({ scamType: b.scamType, count: b._count._all, amount: b._sum.totalAmountInr ?? 0 }))
      .sort((a, b) => b.count - a.count),
    series,
  };
}

export const PAGE_SIZE = 50;

/** The whole public board, newest exposure first, paginated. Nothing is ever dropped from this list. */
export async function getBoard(page = 1) {
  const skip = Math.max(0, page - 1) * PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.account.findMany({
      where: PUBLIC_WHERE,
      orderBy: [{ exposedOn: "desc" }, { lastReported: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.account.count({ where: PUBLIC_WHERE }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
