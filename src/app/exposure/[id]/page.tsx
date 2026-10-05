import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Identifier, RoleBadge, TypeBadge } from "@/components/ui";
import { scamLabel, typeLabel, SCAM_TYPES } from "@/lib/scamTypes";
import { mask } from "@/lib/identifiers";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { requestMeta } from "@/lib/request";
import { CommentForm, CommentList, Reactions } from "./Comments";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: PageProps<"/exposure/[id]">) {
  const { id } = await params;
  const a = await prisma.account.findUnique({
    where: { id },
    include: {
      comments: { where: { status: "VISIBLE" }, orderBy: { createdAt: "desc" }, take: 200 },
      reactions: true,
    },
  });
  if (!a || a.status !== "APPROVED" || a.visibility === "HIDDEN") notFound();
  // Reports that name this account either as primary or as one of several identifiers.
  const reports = await prisma.report.findMany({
    where: { status: "APPROVED", OR: [{ accountId: a.id }, { identifiers: { some: { accountId: a.id } } }] },
    orderBy: { createdAt: "desc" },
    include: { identifiers: true },
  });
  const scam = SCAM_TYPES.find((s) => s.key === a.scamType);
  const tags = a.tags.split(",").map((t) => t.trim()).filter(Boolean);
  const { ipHash } = await requestMeta();
  const settings = await getSettings();
  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const r of a.reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (r.ipHash === ipHash) mine.push(r.emoji);
  }
  const links = [...new Set(reports.map((r) => r.websiteUrl).filter((x): x is string => !!x))];
  const related = reports
    .flatMap((r) => r.identifiers)
    .filter((i) => i.accountId && i.accountId !== a.id)
    .filter((i, idx, arr) => arr.findIndex((x) => x.accountId === i.accountId) === idx);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← Back to today
      </Link>
      <div className="card p-6">
        <div className="flex flex-wrap gap-2 items-center">
          <RoleBadge role={a.role} />
          <TypeBadge type={a.type} />
          <span className="badge badge-gray">{scamLabel(a.scamType)}</span>
          {a.visibility === "MASKED" && (a.type === "BANK" || a.type === "UPI") && (
            <span className="badge badge-gray">last 4 shown. Search the full number to see the complete record</span>
          )}
        </div>
        <h1 className="mt-3 text-2xl md:text-3xl font-bold break-all">
          <Identifier a={a} />
        </h1>
        <div className="mt-1 text-muted text-sm flex flex-wrap gap-x-4 gap-y-1">
          {a.holderName && <span>Name on account: <span className="text-fg">{a.holderName}</span></span>}
          {a.bankName && <span>Bank: <span className="text-fg">{a.bankName}</span></span>}
          {a.platform && <span>Platform: <span className="text-fg">{a.platform}</span></span>}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Reports</div>
            <div className="text-xl font-bold tabular-nums">{a.reportCount}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Reported loss</div>
            <div className="text-xl font-bold tabular-nums">{a.totalAmountInr ? inr(a.totalAmountInr) : "-"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Exposed on</div>
            <div className="text-xl font-bold">{a.exposedOn ? fmtDate(a.exposedOn) : "-"}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-1">How this account was used</div>
          <p>{a.summary}</p>
          {scam && <p className="text-sm text-muted mt-2">{scam.desc}</p>}
        </div>

        {links.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Links used in this scam (do not open or log in)</div>
            <ul className="text-sm mono space-y-1">
              {links.map((l) => (
                <li key={l} className="break-all text-danger">
                  {l.replace(/^https?:\/\//, "").replace(/\./g, "[.]")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {related.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Reported together with</div>
            <div className="flex flex-wrap gap-1">
              {related.map((i) => (
                <Link key={i.id} href={`/exposure/${i.accountId}`} className="badge badge-gray normal-case hover:border-fg">
                  {typeLabel(i.type)}: <span className="mono ml-1">{i.type === "BANK" || i.type === "UPI" ? mask(i.type, i.value) : i.value}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {tags.map((t) => (
              <span key={t} className="badge badge-gray">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 text-xs text-muted">
          First reported {fmtDate(a.firstReported)} · last reported {fmtDate(a.lastReported)} · source {a.source.toLowerCase()}
        </div>

        <div className="mt-5 pt-5 border-t border-line">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">How do you feel about this?</div>
          {settings.commentsOpen ? <Reactions accountId={a.id} counts={counts} mine={mine} /> : <div className="text-xs text-muted">Reactions paused by the admin.</div>}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Victim reports ({reports.length})</h2>
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="border-l-2 border-line pl-4">
                <div className="text-xs text-muted">
                  {r.incidentDate ? `Incident ${fmtDateTime(r.incidentDate)}` : `Reported ${fmtDate(r.createdAt)}`} · {r.scamName ?? scamLabel(r.scamType)}{" "}
                  {r.amountInr ? `· lost ${inr(r.amountInr)}` : ""} {r.paymentMethod ? `· via ${r.paymentMethod}` : ""} {r.reporterCity ? `· ${r.reporterCity}` : ""}
                </div>
                <p className="text-sm mt-1 whitespace-pre-line">{r.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Comments ({a.comments.length})</h2>
        {settings.commentsOpen ? <CommentForm accountId={a.id} /> : <div className="text-sm text-muted">Comments are paused by the admin right now.</div>}
        <CommentList comments={a.comments} />
      </div>

      <div className="card p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="text-sm">
          <div className="font-semibold">Were you targeted by this account too?</div>
          <div className="text-muted">Add your report with screenshots. More reports raise the warning level and strengthen the police case file.</div>
        </div>
        <Link href={`/report?type=${a.type}&value=${encodeURIComponent(a.value)}`} className="btn btn-danger btn-sm">
          Add a report
        </Link>
      </div>
      <p className="text-xs text-muted">Listed in error? Account holders can request a review via the Report page by choosing “Dispute a listing”.</p>
    </div>
  );
}
