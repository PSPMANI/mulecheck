import Link from "next/link";
import type { Account } from "@prisma/client";
import { displayValue } from "@/lib/identifiers";
import { scamLabel, typeLabel, roleLabel } from "@/lib/scamTypes";
import { inr, fmtDate, dateKey } from "@/lib/format";

export function StatTile({ label, value, sub, tone = "gray" }: { label: string; value: string | number; sub?: string; tone?: "red" | "amber" | "green" | "blue" | "gray" }) {
  const color = { red: "text-danger", amber: "text-warn", green: "text-ok", blue: "text-info", gray: "text-fg" }[tone];
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <div className={`stat-value mt-2 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const cls = role === "MULE" ? "badge-red" : role === "SCAMMER" ? "badge-amber" : "badge-blue";
  return <span className={`badge ${cls}`}>{roleLabel(role)}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  return <span className="badge badge-gray">{typeLabel(type)}</span>;
}

export function Identifier({ a, className = "" }: { a: Pick<Account, "type" | "value" | "visibility">; className?: string }) {
  const v = displayValue(a);
  if (v === null) return <span className={`mono text-muted ${className}`}>[withheld]</span>;
  return <span className={`mono ${className}`}>{v}</span>;
}

export function Sparkline({ series }: { series: { date: string; count: number }[] }) {
  const w = 280;
  const h = 56;
  const max = Math.max(1, ...series.map((s) => s.count));
  const step = w / Math.max(1, series.length - 1);
  const pts = series.map((s, i) => [i * step, h - 4 - (s.count / max) * (h - 8)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" role="img" aria-label="Exposures per day, last 14 days">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 0} fill="var(--primary)" />
      ))}
    </svg>
  );
}

export function AccountTable({ rows, showDate = false, highlightToday = false }: { rows: Account[]; showDate?: boolean; highlightToday?: boolean }) {
  if (rows.length === 0)
    return (
      <div className="card p-10 text-center">
        <div className="text-base font-semibold">Nothing on the board yet</div>
        <p className="text-sm text-muted mt-1">Verified reports appear here as moderators approve them.</p>
      </div>
    );
  const today = dateKey(new Date());
  return (
    <div className="card overflow-x-auto">
      <table className="data">
        <thead>
          <tr>
            <th>Identifier</th>
            <th>Role</th>
            <th>Scam</th>
            <th className="hidden md:table-cell">Pattern</th>
            <th className="text-right">Reports</th>
            <th className="text-right">Loss</th>
            {showDate && <th>Exposed</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const isToday = highlightToday && !!a.exposedOn && dateKey(a.exposedOn) === today;
            return (
              <tr key={a.id} className={isToday ? "bg-[color:var(--red-soft)]" : ""}>
                <td>
                  <Link href={`/exposure/${a.id}`} className="block hover:underline text-fg">
                    <Identifier a={a} className="font-semibold" />
                    {isToday && <span className="badge badge-red ml-2 align-middle">New today</span>}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 items-center text-xs text-muted">
                    <TypeBadge type={a.type} />
                    {a.bankName && <span>{a.bankName}</span>}
                    {a.platform && <span>{a.platform}</span>}
                    {a.holderName && <span className="text-fg font-medium">“{a.holderName}”</span>}
                  </div>
                </td>
                <td>
                  <RoleBadge role={a.role} />
                </td>
                <td className="whitespace-nowrap">{scamLabel(a.scamType)}</td>
                <td className="hidden md:table-cell text-muted max-w-md">
                  <span className="line-clamp-2">{a.summary}</span>
                </td>
                <td className="text-right tabular-nums font-medium">{a.reportCount}</td>
                <td className="text-right tabular-nums whitespace-nowrap font-medium">{a.totalAmountInr ? inr(a.totalAmountInr) : "-"}</td>
                {showDate && <td className="whitespace-nowrap text-muted">{a.exposedOn ? fmtDate(a.exposedOn) : "-"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
