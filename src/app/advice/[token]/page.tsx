import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { typeLabel, scamLabel } from "@/lib/scamTypes";
import { adviceCategoryLabel } from "@/lib/adviceCategories";
import { inr, fmtDateTime } from "@/lib/format";
import { VERDICTS } from "@/lib/verdicts";

export const dynamic = "force-dynamic";

export default async function AdviceStatus({ params }: PageProps<"/advice/[token]">) {
  const { token } = await params;
  const r = await prisma.adviceRequest.findUnique({ where: { token }, include: { evidence: true } });
  if (!r) notFound();
  const matched = r.matchedAccountId ? await prisma.account.findUnique({ where: { id: r.matchedAccountId } }) : null;
  const v = r.verdict ? VERDICTS[r.verdict] : null;
  const title = r.subject || r.identifier || r.websiteUrl || "Your request";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted">Guidance request · {fmtDateTime(r.createdAt)}</div>
        <h1 className="text-2xl font-bold tracking-tight mt-1 break-all">{title}</h1>
        <div className="text-sm text-muted mt-1 space-x-1">
          <span>{adviceCategoryLabel(r.category)}</span>
          {r.identifier && (
            <span>
              · {typeLabel(r.identifierType)} <span className="mono text-fg">{r.identifier}</span>
            </span>
          )}
          {r.holderName && <span>· {r.holderName}</span>}
          {r.bankName && <span>· {r.bankName}</span>}
          {r.platform && <span>· via {r.platform}</span>}
          {r.websiteUrl && <span className="mono break-all">· {r.websiteUrl}</span>}
          {r.amountInr ? <span>· {inr(r.amountInr)}</span> : null}
          {r.evidence.length > 0 && <span>· {r.evidence.length} screenshot{r.evidence.length === 1 ? "" : "s"} attached</span>}
        </div>
      </div>

      {matched && (
        <div className="card p-5 border-danger/60 bg-danger/10">
          <span className="badge badge-red">Already in our records</span>
          <h2 className="text-xl font-bold mt-2">Stop. This is already exposed as {scamLabel(matched.scamType).toLowerCase()}.</h2>
          <p className="text-sm mt-1">
            {matched.summary} Reported {matched.reportCount} {matched.reportCount === 1 ? "time" : "times"}
            {matched.totalAmountInr ? ` with ${inr(matched.totalAmountInr)} in losses` : ""}. Do not deposit, invest or share documents.
          </p>
          <Link href={`/search?q=${encodeURIComponent(matched.value)}`} className="btn btn-sm mt-3">
            See full record
          </Link>
        </div>
      )}

      {r.status === "ANSWERED" && v ? (
        <div className={`card p-6 ${r.verdict === "SCAM" ? "border-danger/60" : r.verdict === "SUSPICIOUS" ? "border-warn/60" : r.verdict === "SAFE" ? "border-ok/60" : ""}`}>
          <span className={`badge ${v.cls}`}>Moderator verdict · {v.label}</span>
          <h2 className="text-2xl font-bold mt-2">{v.headline}</h2>
          <p className="mt-3 whitespace-pre-line">{r.adminReply}</p>
          <div className="text-xs text-muted mt-4">Answered {r.answeredAt && fmtDateTime(r.answeredAt)}</div>
        </div>
      ) : (
        <div className="card p-6">
          <span className="badge badge-blue pulse">Under review</span>
          <h2 className="text-xl font-semibold mt-2">A moderator is checking this.</h2>
          <p className="text-muted text-sm mt-1">
            Bookmark this page or keep the link. It updates when the verdict is in. Until then, do not send any money or documents.
          </p>
        </div>
      )}

      <div className="card p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted">What you told us</div>
        <p className="text-sm mt-1 whitespace-pre-line">{r.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={r.identifier ? `/report?type=${r.identifierType}&value=${encodeURIComponent(r.identifier)}` : "/report"} className="btn btn-danger btn-sm">
          It turned out to be a scam, report it
        </Link>
        <Link href="/advice" className="btn btn-sm">
          Ask about another
        </Link>
      </div>
    </div>
  );
}
