import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { scamLabel, typeLabel, roleLabel } from "@/lib/scamTypes";
import { inr, fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Printable case file for police / bank nodal officers. Use the browser's Print to save as PDF. */
export default async function CaseFile({ params }: PageProps<"/admin/case/[accountId]">) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { accountId } = await params;
  const a = await prisma.account.findUnique({
    where: { id: accountId },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!a) notFound();
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
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) =>
    v ? (
      <tr>
        <td className="pr-4 py-1 text-muted align-top whitespace-nowrap">{k}</td>
        <td className="py-1 break-all">{v}</td>
      </tr>
    ) : null;

  return (
    <div className="max-w-4xl space-y-6 print:text-black">
      <style>{`@media print { header, footer, .no-print { display: none !important } body { background: white; color: black } .card { border-color: #ccc; background: white } .text-muted { color: #555 } }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <h1 className="text-2xl font-bold">Case file</h1>
        <div className="flex gap-2">
          <a href={`/admin/export/${a.id}`} className="btn btn-sm">
            Download JSON dossier
          </a>
          <a href="#" onClick={undefined} className="btn btn-sm" data-print>
            Print / Save as PDF
          </a>
          <a href="/admin?tab=accounts" className="btn btn-sm">
            Back
          </a>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `document.querySelector('[data-print]').addEventListener('click',e=>{e.preventDefault();window.print()})` }} />

      <div className="card p-6">
        <div className="text-xs uppercase tracking-widest text-muted">MuleCheck evidence dossier · generated {fmtDateTime(new Date())}</div>
        <h2 className="text-xl font-bold mt-1 mono break-all">{a.value}</h2>
        <table className="text-sm mt-3">
          <tbody>
            <Row k="Identifier type" v={typeLabel(a.type)} />
            <Row k="Name on account" v={a.holderName} />
            <Row k="Bank / app" v={a.bankName} />
            <Row k="Platform" v={a.platform} />
            <Row k="Role" v={roleLabel(a.role)} />
            <Row k="Scam type" v={scamLabel(a.scamType)} />
            <Row k="Summary" v={a.summary} />
            <Row k="Total reported loss" v={a.totalAmountInr ? inr(a.totalAmountInr) : null} />
            <Row k="Approved reports" v={String(a.reportCount)} />
            <Row k="First reported" v={fmtDateTime(a.firstReported)} />
            <Row k="Last reported" v={fmtDateTime(a.lastReported)} />
            <Row k="Published on" v={a.exposedOn ? fmtDateTime(a.exposedOn) : null} />
            <Row k="Moderator notes" v={a.adminNotes} />
            <Row k="Record ID" v={a.id} />
          </tbody>
        </table>
      </div>

      <h3 className="font-semibold">Victim reports ({reports.length})</h3>
      {reports.map((r, i) => (
        <div key={r.id} className="card p-5 text-sm">
          <div className="font-semibold">
            Report {i + 1} · submitted {fmtDateTime(r.createdAt)} · {r.status}
          </div>
          <table className="mt-2">
            <tbody>
              <Row k="Incident date/time (IST)" v={r.incidentDate ? fmtDateTime(r.incidentDate) : null} />
              <Row k="Scam type" v={scamLabel(r.scamType)} />
              <Row k="Scam name" v={r.scamName} />
              <Row k="All identifiers in this report" v={r.identifiers.length ? r.identifiers.map((i) => `${typeLabel(i.type)}: ${i.value}`).join(" | ") : null} />
              <Row k="Amount lost" v={r.amountInr ? inr(r.amountInr) : null} />
              <Row k="Payment method" v={r.paymentMethod} />
              <Row k="Transaction ref" v={r.transactionRef} />
              <Row k="Victim bank" v={r.victimBank} />
              <Row k="Website / link" v={r.websiteUrl} />
              <Row k="External evidence" v={r.evidenceUrl} />
              <Row k="Reporter" v={[r.reporterName, r.reporterEmail, r.reporterPhone, r.reporterCity].filter(Boolean).join(" · ") || null} />
              <Row k="Submission IP hash" v={r.ipHash} />
              <Row k="Device" v={r.userAgent} />
            </tbody>
          </table>
          <p className="mt-2 whitespace-pre-line">{r.description}</p>
          {r.evidence.length > 0 && (
            <div className="mt-3">
              <div className="text-muted mb-1">Evidence files ({r.evidence.length})</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {r.evidence.map((e) => (
                  <figure key={e.id} className="border border-line rounded-lg p-2">
                    {e.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/admin/evidence/${e.id}`} alt={e.originalName} className="max-h-96 w-auto mx-auto" />
                    ) : (
                      <a href={`/admin/evidence/${e.id}`} className="underline" target="_blank">
                        Open {e.originalName}
                      </a>
                    )}
                    <figcaption className="text-xs text-muted mt-1 break-all">
                      {e.originalName} · {(e.sizeBytes / 1024).toFixed(0)} KB · uploaded {fmtDateTime(e.createdAt)}
                      <br />
                      SHA-256 {e.sha256}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {advice.length > 0 && (
        <>
          <h3 className="font-semibold">Guidance requests mentioning this identifier ({advice.length})</h3>
          {advice.map((g) => (
            <div key={g.id} className="card p-5 text-sm">
              <div className="font-semibold">
                {fmtDateTime(g.createdAt)} · {g.verdict ?? "unanswered"}
              </div>
              <table className="mt-2">
                <tbody>
                  <Row k="Asked about" v={[g.subject, g.identifier].filter(Boolean).join(" · ") || null} />
                  <Row k="Amount asked" v={g.amountInr ? inr(g.amountInr) : null} />
                  <Row k="Website / link" v={g.websiteUrl} />
                  <Row k="Platform" v={g.platform} />
                  <Row k="Requester" v={[g.contactName, g.contactEmail, g.contactPhone].filter(Boolean).join(" · ") || null} />
                  <Row k="Moderator reply" v={g.adminReply} />
                </tbody>
              </table>
              <p className="mt-2 whitespace-pre-line">{g.description}</p>
              {g.evidence.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {g.evidence.map((e) => (
                    <figure key={e.id} className="border border-line rounded-lg p-2">
                      {e.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/admin/evidence/${e.id}`} alt={e.originalName} className="max-h-96 w-auto mx-auto" />
                      ) : (
                        <a href={`/admin/evidence/${e.id}`} className="underline" target="_blank">
                          Open {e.originalName}
                        </a>
                      )}
                      <figcaption className="text-xs text-muted mt-1 break-all">
                        {e.originalName} · SHA-256 {e.sha256}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {a.comments.length > 0 && (
        <div className="card p-5 text-sm">
          <h3 className="font-semibold mb-2">Public comments ({a.comments.length})</h3>
          <ul className="space-y-2">
            {a.comments.map((c) => (
              <li key={c.id}>
                <span className="text-muted">{fmtDateTime(c.createdAt)}</span> · <strong>{c.name}</strong>: {c.body}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
