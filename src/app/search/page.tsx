import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { candidateHashes } from "@/lib/identifiers";
import { scamLabel, typeLabel, SCAM_TYPES } from "@/lib/scamTypes";
import { RoleBadge, TypeBadge } from "@/components/ui";
import { inr, fmtDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const s = await getSettings();

  // Exact match across every identifier type. A visitor who holds the full identifier sees the complete record,
  // including values the public list masks or hides.
  const matches = q
    ? await prisma.account.findMany({
        where: { status: "APPROVED", OR: candidateHashes(q).map((c) => ({ type: c.type, valueHash: c.hash })) },
        orderBy: { reportCount: "desc" },
      })
    : [];
  const reportsByAccount = new Map<string, Awaited<ReturnType<typeof prisma.report.findMany>>>();
  for (const m of matches) {
    reportsByAccount.set(
      m.id,
      await prisma.report.findMany({
        where: { status: "APPROVED", OR: [{ accountId: m.id }, { identifiers: { some: { accountId: m.id } } }] },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{s.searchTitle}</h1>
        <p className="text-muted mt-1">{s.searchSub}</p>
      </div>
      <form className="card p-4 flex flex-col sm:flex-row gap-2" action="/search">
        <input name="q" defaultValue={q} className="input flex-1 mono" placeholder="50100234567891 · name@okaxis · 9876543210 · @telegram_user · 0x…" autoFocus />
        <button className="btn btn-primary">Verify</button>
      </form>

      {q && matches.length === 0 && (
        <div className="card p-6 border-ok/40">
          <div className="badge badge-green">No match</div>
          <h2 className="text-xl font-semibold mt-2">Not in our records</h2>
          <p className="text-muted text-sm mt-1">
            That does not make it safe. New mule accounts are opened every day. Never share OTPs, never pay to “verify” or “release” anything, and never
            install an app a caller tells you to.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href={`/advice?identifier=${encodeURIComponent(q)}`} className="btn btn-danger btn-sm">
              Ask a moderator before paying
            </Link>
            <Link href={`/report?value=${encodeURIComponent(q)}`} className="btn btn-sm">
              Report this identifier
            </Link>
          </div>
        </div>
      )}

      {matches.map((a) => {
        const scam = SCAM_TYPES.find((s) => s.key === a.scamType);
        return (
          <div key={a.id} className="card p-6 border-danger/50 bg-danger/5 space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="badge badge-red">
                {a.role === "MULE" ? "Scam / mule account" : "Scam / fraud"} · reported {a.reportCount} {a.reportCount === 1 ? "time" : "times"}
              </span>
              <RoleBadge role={a.role} />
              <TypeBadge type={a.type} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Full record</div>
              <h2 className="text-2xl font-bold mono break-all">{a.value}</h2>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <Field k="Name on account" v={a.holderName} />
              <Field k="Bank / app" v={a.bankName} />
              <Field k="Platform used" v={a.platform} />
              <Field k="Scam type" v={scamLabel(a.scamType)} />
              <Field k="Reported loss" v={a.totalAmountInr ? inr(a.totalAmountInr) : "-"} />
              <Field k="Last reported" v={fmtDate(a.lastReported)} />
              <Field k="First reported" v={fmtDate(a.firstReported)} />
              <Field k="Exposed on" v={a.exposedOn ? fmtDate(a.exposedOn) : "-"} />
              <Field k="Type" v={typeLabel(a.type)} />
            </dl>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">How it was used</div>
              <p className="mt-1">{a.summary}</p>
              {scam && <p className="text-sm text-muted mt-1">{scam.desc}</p>}
            </div>
            {(reportsByAccount.get(a.id)?.length ?? 0) > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Victim reports ({reportsByAccount.get(a.id)?.length ?? 0})</div>
                <ul className="space-y-3">
                  {(reportsByAccount.get(a.id) ?? []).map((r) => (
                    <li key={r.id} className="border-l-2 border-line pl-3 text-sm">
                      <div className="text-xs text-muted">
                        {fmtDate(r.createdAt)} · {scamLabel(r.scamType)} {r.amountInr ? `· lost ${inr(r.amountInr)}` : ""} {r.reporterCity ? `· ${r.reporterCity}` : ""}
                      </div>
                      <p className="mt-1 whitespace-pre-line">{r.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="p-3 rounded-lg bg-bg text-sm">
              <strong>Do not transfer money to this account.</strong> If you already did, call <span className="mono">1930</span> now and file at
              cybercrime.gov.in.
            </div>
            <div className="flex flex-wrap gap-2">
              {a.visibility !== "HIDDEN" && (
                <Link href={`/exposure/${a.id}`} className="btn btn-sm">
                  Public page
                </Link>
              )}
              <Link href={`/report?type=${a.type}&value=${encodeURIComponent(a.value)}`} className="btn btn-danger btn-sm">
                Add my report
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="font-medium break-all">{v}</dd>
    </div>
  );
}
