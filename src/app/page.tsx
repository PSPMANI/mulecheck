import Link from "next/link";
import { getDailyExposure, getStats, getBoard } from "@/lib/queries";
import { AccountTable, Sparkline, StatTile } from "@/components/ui";
import { scamLabel, typeLabel } from "@/lib/scamTypes";
import { inr, fmtDate } from "@/lib/format";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PanicNotice } from "@/components/PanicNotice";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const HELP = [
  {
    t: "Verify before you pay",
    d: "Paste the exact number, UPI ID or account. If it is on record you see the complete entry.",
    href: "/search",
    cta: "Verify an account",
    icon: "M11 4a7 7 0 1 0 4.9 12l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0 0 11 4z",
  },
  {
    t: "Not sure about an offer?",
    d: "Send the app, job or scheme with screenshots. A moderator tells you whether to go ahead.",
    href: "/advice",
    cta: "Get advice",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14v.01M12 7v5",
  },
  {
    t: "Ask the community",
    d: "One open feed. Post what you got, reply to others, vote scam or genuine, react with an emoji.",
    href: "/community",
    cta: "Open the feed",
    icon: "M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z",
  },
  {
    t: "Learn the playbooks",
    d: "Digital arrest, task jobs, trading groups, loan apps and more, with the red flags for each.",
    href: "/scams",
    cta: "Read the guide",
    icon: "M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4zm0 0a3 3 0 0 1 3-3h11v3",
  },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const today = new Date();
  const [s, stats, todayRows, board] = await Promise.all([getSettings(), getStats(), getDailyExposure(today), getBoard(page)]);
  const topScams = stats.byScam.slice(0, 6);
  const maxScam = Math.max(1, ...topScams.map((x) => x.count));

  return (
    <div className="space-y-10">
      <section className="hero px-6 py-8 md:px-10 md:py-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow !text-white/80">{s.homeKicker}</span>
              <LiveRefresh seconds={60} light />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold tracking-tight mt-3 leading-[1.1]">{s.homeHeadline.replace("{day}", "today")}</h1>
            <p className="!text-white/85 mt-4 text-base md:text-lg leading-relaxed">{s.homeSub}</p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-3 shrink-0">
            <Link href="/search" className="btn !bg-white !text-navy !border-white hover:!bg-white/90">
              Verify an account
            </Link>
            <Link href="/report" className="btn btn-danger">
              Report a scam
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4">
        <StatTile label="Exposed today" value={todayRows.length} tone="red" sub={fmtDate(today)} />
        <StatTile label="Mule accounts" value={stats.mules} tone="amber" sub={`${stats.total} identifiers on the board`} />
        <StatTile label="Reported losses" value={inr(stats.totalAmount)} tone="gray" sub={`${stats.totalReports} victim reports`} />
        <StatTile label="Awaiting review" value={stats.pending} tone="blue" sub="in the moderation queue" />
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="eyebrow">Exposures per day</div>
          <div className="text-sm text-muted mt-0.5">Last 14 days</div>
          <div className="mt-4">
            <Sparkline series={stats.series} />
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-1">
            <span>{stats.series[0]?.date.slice(5)}</span>
            <span>{stats.series.at(-1)?.date.slice(5)}</span>
          </div>
        </div>
        <div className="card p-5 md:col-span-2">
          <div className="eyebrow">Top scam patterns</div>
          <div className="text-sm text-muted mt-0.5">By number of exposed identifiers</div>
          <div className="space-y-3 mt-4">
            {topScams.length === 0 && <div className="text-sm text-muted">No data yet.</div>}
            {topScams.map((x) => (
              <div key={x.scamType} className="flex items-center gap-3 text-sm">
                <div className="w-40 shrink-0 truncate font-medium">{scamLabel(x.scamType)}</div>
                <div className="flex-1 h-2.5 rounded-full bg-bg3 overflow-hidden">
                  <div className="h-full rounded-full bg-danger" style={{ width: `${(x.count / maxScam) * 100}%` }} />
                </div>
                <div className="w-10 text-right tabular-nums font-semibold">{x.count}</div>
                <div className="w-20 text-right tabular-nums text-muted hidden sm:block">{x.amount ? inr(x.amount) : ""}</div>
              </div>
            ))}
          </div>
          {stats.byType.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-line">
              {stats.byType.map((t) => (
                <span key={t.type} className="badge badge-gray">
                  {typeLabel(t.type)} · {t.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <PanicNotice title={s.panicTitle} body={s.panicBody} />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="eyebrow">Public record</div>
            <h2 className="section-title mt-1">Exposure board</h2>
            <p className="text-sm text-muted mt-1">
              {board.total} identifiers, newest first. {todayRows.length} added today. Entries stay on the board permanently.
            </p>
          </div>
          <Link href="/search" className="btn btn-sm">
            Search the full record
          </Link>
        </div>
        <AccountTable rows={board.rows} showDate highlightToday />
        {board.pages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            {board.page > 1 ? (
              <Link href={`/?page=${board.page - 1}`} className="btn btn-sm">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">
              Page {board.page} of {board.pages}
            </span>
            {board.page < board.pages ? (
              <Link href={`/?page=${board.page + 1}`} className="btn btn-sm">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </section>

      <section>
        <div className="eyebrow mb-3">How {s.siteName} helps</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {HELP.map((c) => (
            <div key={c.href} className="card p-5 flex flex-col">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--primary-soft)] text-primary mb-3" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={c.icon} />
                </svg>
              </span>
              <div className="font-semibold">{c.t}</div>
              <p className="text-sm text-muted mt-1 flex-1">{c.d}</p>
              <Link href={c.href} className="btn btn-sm mt-4 self-start">
                {c.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
