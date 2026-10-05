import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentAdmin } from "@/lib/auth";
import { UsersPanel } from "./users/UsersPanel";
import { approveReport, rejectReport, setVisibility, setStatus, reExposeToday, deleteAccount, logout, answerAdvice, hideComment, moderatePost, moderateReply, moderatorReply, resolveFlag } from "./actions";
import { touchAdminPresence } from "@/lib/presence";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { SiteTextForm } from "./SiteTextForm";
import { FLAG_REASONS } from "@/lib/moderation";
import { VERDICTS } from "@/lib/verdicts";
import { adviceCategoryLabel } from "@/lib/adviceCategories";
import { SCAM_TYPES } from "@/lib/scamTypes";
import { AddAccountForm } from "./AddAccountForm";
import { EditAccount } from "./EditAccount";
import { scamLabel, typeLabel } from "@/lib/scamTypes";
import { inr, fmtDateTime, fmtDate } from "@/lib/format";
import { mask } from "@/lib/identifiers";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  await touchAdminPresence();
  const sp = await searchParams;
  const owner = me.role === "OWNER";
  const requested = typeof sp.tab === "string" ? sp.tab : "queue";
  const OWNER_TABS = ["settings", "text", "users"];
  const tab = !owner && OWNER_TABS.includes(requested) ? "queue" : requested;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.status === "string" ? sp.status : "";

  const [pendingReports, counts, advice] = await Promise.all([
    prisma.report.findMany({ where: { status: "PENDING" }, include: { account: true, evidence: true, identifiers: true }, orderBy: { createdAt: "asc" }, take: 100 }),
    Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.account.count({ where: { status: "APPROVED" } }),
      prisma.account.count({ where: { visibility: "HIDDEN" } }),
      prisma.adviceRequest.count({ where: { status: "PENDING" } }),
      prisma.flag.count({ where: { status: "OPEN" } }),
    ]),
    tab === "advice" ? prisma.adviceRequest.findMany({ include: { evidence: true }, orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 100 }) : Promise.resolve([]),
  ]);
  const comments =
    tab === "comments"
      ? await prisma.comment.findMany({ include: { account: { select: { id: true, value: true, type: true } } }, orderBy: { createdAt: "desc" }, take: 200 })
      : [];
  const posts =
    tab === "community"
      ? await prisma.communityPost.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { replies: { orderBy: { createdAt: "asc" } }, images: { where: { replyId: null }, take: 4 } },
        })
      : [];
  const flags = tab === "flags" ? await prisma.flag.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 200 }) : [];
  const flagTargets = {
    POST: new Map((await prisma.communityPost.findMany({ where: { id: { in: flags.filter((f) => f.targetType === "POST").map((f) => f.targetId) } } })).map((x) => [x.id, { text: x.title + " - " + x.body, name: x.authorName, status: x.status, link: `/community/${x.id}` }])),
    REPLY: new Map((await prisma.communityReply.findMany({ where: { id: { in: flags.filter((f) => f.targetType === "REPLY").map((f) => f.targetId) } } })).map((x) => [x.id, { text: x.body, name: x.authorName, status: x.status, link: `/community/${x.postId}` }])),
    COMMENT: new Map((await prisma.comment.findMany({ where: { id: { in: flags.filter((f) => f.targetType === "COMMENT").map((f) => f.targetId) } } })).map((x) => [x.id, { text: x.body, name: x.name, status: x.status, link: `/exposure/${x.accountId}` }])),
  } as Record<string, Map<string, { text: string; name: string; status: string; link: string }>>;
  const settings = tab === "settings" || tab === "text" ? await getSettings() : null;
  const users = tab === "users" ? await prisma.adminUser.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] }) : [];
  const logs = tab === "log" ? await prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 }) : [];
  const matchedIds = advice.map((a) => a.matchedAccountId).filter((x): x is string => !!x);
  const matchedAccounts = matchedIds.length ? await prisma.account.findMany({ where: { id: { in: matchedIds } } }) : [];

  const accounts =
    tab === "accounts"
      ? await prisma.account.findMany({
          where: {
            ...(filter ? { status: filter } : {}),
            ...(q ? { OR: [{ value: { contains: q } }, { holderName: { contains: q } }, { bankName: { contains: q } }, { summary: { contains: q } }] } : {}),
          },
          orderBy: { updatedAt: "desc" },
          take: 200,
        })
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Moderation</h1>
          <p className="text-sm text-muted">
            {counts[0]} pending reports · {counts[3]} guidance requests waiting · {counts[4]} user flags · {counts[1]} published accounts · {counts[2]} hidden
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">
            Signed in as <span className="mono text-fg">{me.username}</span> <span className="badge badge-gray ml-1">{me.role}</span>
          </span>
          <Link href="/admin/password" className="btn btn-sm">
            Change password
          </Link>
          <Link href="/admin/import" className="btn btn-sm">
            Import CSV
          </Link>
          <form action={logout}>
            <button className="btn btn-sm">Log out</button>
          </form>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line text-sm overflow-x-auto whitespace-nowrap -mx-4 px-4">
        {[
          ["queue", `Review queue (${counts[0]})`],
          ["accounts", "All accounts"],
          ["add", "Add verified account"],
          ["advice", `Guidance requests (${counts[3]})`],
          ["comments", "Comments"],
          ["community", "Community"],
          ["flags", `User reports (${counts[4]})`],
          ["log", "Audit log"],
          ...(owner
            ? [
                ["settings", "Settings"],
                ["text", "Site text"],
                ["users", "Users"],
              ]
            : []),
        ].map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} className={`px-4 py-2 -mb-px border-b-2 ${tab === k ? "border-danger text-fg" : "border-transparent text-muted"}`}>
            {l}
          </Link>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-3">
          {pendingReports.length === 0 && <div className="card p-8 text-center text-muted">Queue is empty.</div>}
          {pendingReports.map((r) => {
            const a = r.account;
            const isDispute = r.description.startsWith("[DISPUTE");
            return (
              <div key={r.id} className={`card p-4 ${isDispute ? "border-warn/50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      {isDispute && <span className="badge badge-amber">Dispute</span>}
                      <span className="badge badge-gray">{typeLabel(a.type)}</span>
                      <span className="badge badge-gray">{scamLabel(r.scamType)}</span>
                      <span className={`badge ${a.status === "APPROVED" ? "badge-green" : "badge-blue"}`}>
                        account {a.status.toLowerCase()} · {a.reportCount} approved
                      </span>
                    </div>
                    <div className="mono text-lg font-semibold mt-1 break-all">{a.value}</div>
                    {r.scamName && <div className="text-sm">Scam name: <span className="font-medium">{r.scamName}</span></div>}
                    {r.identifiers.length > 1 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.identifiers.map((i) => (
                          <span key={i.id} className="badge badge-gray normal-case">
                            {typeLabel(i.type)}: <span className="mono ml-1">{i.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted">
                      {a.bankName} {a.holderName && `· "${a.holderName}"`} {a.platform && `· ${a.platform}`} · submitted {fmtDateTime(r.createdAt)}{" "}
                      {r.reporterCity && `· ${r.reporterCity}`} {r.reporterEmail && `· ${r.reporterEmail}`}
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-line">{r.description}</p>
                    <div className="text-xs text-muted mt-2 flex flex-wrap gap-3">
                      {r.amountInr > 0 && <span>Loss {inr(r.amountInr)}</span>}
                      {r.incidentDate && <span>Incident {fmtDateTime(r.incidentDate)}</span>}
                      {r.paymentMethod && <span>{r.paymentMethod}</span>}
                      {r.transactionRef && <span className="mono">ref {r.transactionRef}</span>}
                      {r.victimBank && <span>from {r.victimBank}</span>}
                      {r.websiteUrl && <span className="mono break-all">{r.websiteUrl}</span>}
                      {r.evidenceUrl && (
                        <a href={r.evidenceUrl} target="_blank" rel="noreferrer" className="underline">
                          External evidence
                        </a>
                      )}
                      {r.reporterName && <span>{r.reporterName}</span>}
                      {r.reporterPhone && <span>{r.reporterPhone}</span>}
                      <span>ip {r.ipHash?.slice(0, 8)}</span>
                    </div>
                    {r.evidence.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.evidence.map((e) => (
                          <a key={e.id} href={`/admin/evidence/${e.id}`} target="_blank" className="block border border-line rounded-lg overflow-hidden" title={e.originalName}>
                            {e.mimeType.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/admin/evidence/${e.id}`} alt={e.originalName} className="h-24 w-auto" />
                            ) : (
                              <span className="block h-24 w-24 text-xs p-2 text-muted">PDF {e.originalName}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <Link href={`/admin/case/${a.id}`} className="text-xs underline text-info">
                        Open case file
                      </Link>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <form action={approveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-ok btn-sm w-full justify-center">{isDispute ? "Uphold dispute (hide)" : "Approve & publish"}</button>
                    </form>
                    <form action={rejectReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-sm w-full justify-center">Reject</button>
                    </form>
                    <VisibilitySelect id={a.id} value={a.visibility} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "accounts" && (
        <div className="space-y-3">
          <form className="flex flex-wrap gap-2" action="/admin">
            <input type="hidden" name="tab" value="accounts" />
            <input name="q" defaultValue={q} className="input sm:w-80" placeholder="Search value, name, bank, summary" />
            <select name="status" defaultValue={filter} className="input sm:w-40">
              <option value="">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className="btn btn-sm">Filter</button>
          </form>
          <div className="card overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Identifier</th>
                  <th>Scam / role</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th className="text-right">Reports / loss</th>
                  <th>Exposed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="mono font-semibold break-all">{a.value}</div>
                      <div className="text-xs text-muted">
                        {typeLabel(a.type)} · public: {a.visibility === "HIDDEN" ? "hidden" : a.visibility === "FULL" ? a.value : mask(a.type, a.value)}
                      </div>
                      <div className="text-xs text-muted">{[a.bankName, a.holderName, a.platform].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="text-xs">
                      {scamLabel(a.scamType)}
                      <br />
                      <span className="text-muted">{a.role}</span>
                    </td>
                    <td>
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={a.id} />
                        <select name="status" defaultValue={a.status} className="input !py-1 !px-2 text-xs w-28" onChange={undefined}>
                          <option value="APPROVED">Approved</option>
                          <option value="PENDING">Pending</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                        <button className="btn btn-sm mt-1 w-28 justify-center">Set</button>
                      </form>
                    </td>
                    <td>
                      <VisibilitySelect id={a.id} value={a.visibility} />
                    </td>
                    <td className="text-right tabular-nums text-xs">
                      {a.reportCount}
                      <br />
                      {a.totalAmountInr ? inr(a.totalAmountInr) : "-"}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      {a.exposedOn ? fmtDate(a.exposedOn) : "-"}
                      <form action={reExposeToday} className="mt-1">
                        <input type="hidden" name="id" value={a.id} />
                        <button className="btn btn-sm">Expose today</button>
                      </form>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <Link href={`/admin/case/${a.id}`} className="btn btn-sm w-full justify-center">
                          Case file
                        </Link>
                        <a href={`/admin/export/${a.id}`} className="btn btn-sm w-full justify-center">
                          Export JSON
                        </a>
                        <EditAccount a={a} />
                        <form action={deleteAccount}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="btn btn-sm text-danger w-full justify-center">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-8">
                      No accounts match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "add" && <AddAccountForm />}

      {tab === "comments" && (
        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>On</th>
                <th>Name</th>
                <th>Comment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td className="text-xs whitespace-nowrap">{fmtDateTime(c.createdAt)}</td>
                  <td className="mono text-xs break-all">
                    <Link href={`/exposure/${c.account.id}`} className="underline">
                      {c.account.value}
                    </Link>
                  </td>
                  <td className="text-xs">{c.name}</td>
                  <td className="text-sm max-w-md whitespace-pre-line">{c.body}</td>
                  <td>
                    <span className={`badge ${c.status === "VISIBLE" ? "badge-green" : "badge-gray"}`}>{c.status}</span>
                  </td>
                  <td>
                    <form action={hideComment}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value={c.status === "VISIBLE" ? "HIDDEN" : "VISIBLE"} />
                      <button className="btn btn-sm">{c.status === "VISIBLE" ? "Hide" : "Show"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {comments.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-8">
                    No comments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "community" && (
        <div className="space-y-3">
          <div className="card p-4 text-sm flex items-center justify-between gap-3">
            <span className="text-muted">While you are logged in, anything you post or reply on the public feed is shown as “MuleCheck moderator” with an Admin badge, and users see “Admin is online”.</span>
            <Link href="/community" className="btn btn-danger btn-sm" target="_blank">
              Open the feed
            </Link>
          </div>
          {posts.length === 0 && <div className="card p-8 text-center text-muted">No community posts yet.</div>}
          {posts.map((p) => (
            <div key={p.id} className={`card p-4 ${p.status === "HIDDEN" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`badge ${p.status === "VISIBLE" ? "badge-green" : "badge-gray"}`}>{p.status}</span>
                    {p.pinned && <span className="badge badge-blue">Pinned</span>}
                    <span className="badge badge-gray">{adviceCategoryLabel(p.category)}</span>
                    <span className="text-xs text-muted">
                      {p.authorName} · {fmtDateTime(p.createdAt)} · ip {p.ipHash?.slice(0, 8)}
                    </span>
                  </div>
                  <Link href={`/community/${p.id}`} className="font-semibold mt-1 block hover:underline" target="_blank">
                    {p.title}
                  </Link>
                  <p className="text-sm text-muted mt-1 line-clamp-3 whitespace-pre-line">{p.body}</p>
                  {p.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {p.images.map((im) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={im.id} src={`/admin/evidence/c/${im.id}`} alt="" className="h-16 rounded border border-line" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <form action={moderatePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={p.status === "VISIBLE" ? "HIDDEN" : "VISIBLE"} />
                    <button className="btn btn-sm w-full justify-center">{p.status === "VISIBLE" ? "Hide post" : "Show post"}</button>
                  </form>
                  <form action={moderatePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="pinned" value={p.pinned ? "0" : "1"} />
                    <button className="btn btn-sm w-full justify-center">{p.pinned ? "Unpin" : "Pin"}</button>
                  </form>
                  <form action={moderatePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="delete" value="1" />
                    <button className="btn btn-sm w-full justify-center text-danger">Delete</button>
                  </form>
                </div>
              </div>
              {p.replies.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted cursor-pointer">{p.replies.length} replies</summary>
                  <ul className="mt-2 space-y-2">
                    {p.replies.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 text-sm border-l-2 border-line pl-3">
                        <div className={r.status === "HIDDEN" ? "opacity-50" : ""}>
                          <span className="text-xs text-muted">
                            {r.authorName} {r.isModerator && "(moderator)"} · {r.verdict ?? "no verdict"} · {fmtDateTime(r.createdAt)}
                          </span>
                          <p className="whitespace-pre-line">{r.body}</p>
                        </div>
                        <form action={moderateReply}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={r.status === "VISIBLE" ? "HIDDEN" : "VISIBLE"} />
                          <button className="btn btn-sm">{r.status === "VISIBLE" ? "Hide" : "Show"}</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <form action={moderatorReply} className="mt-3 grid sm:grid-cols-5 gap-2">
                <input type="hidden" name="postId" value={p.id} />
                <select name="verdict" className="input" defaultValue="SCAM">
                  <option value="SCAM">Scam / fraud</option>
                  <option value="SUSPICIOUS">Looks suspicious</option>
                  <option value="SAFE">Looks genuine</option>
                  <option value="NOT_SURE">Not sure</option>
                </select>
                <input name="body" required className="input sm:col-span-3" placeholder="Reply as moderator (shown with a Moderator badge)" />
                <button className="btn btn-ok btn-sm justify-center">Reply</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {tab === "flags" && (
        <div className="space-y-3">
          {flags.length === 0 && <div className="card p-8 text-center text-muted">No open user reports.</div>}
          {flags.map((f) => {
            const t = flagTargets[f.targetType]?.get(f.targetId);
            return (
              <div key={f.id} className="card p-4">
                <div className="flex flex-wrap gap-2 items-center text-xs text-muted">
                  <span className="badge badge-amber">{FLAG_REASONS.find((r) => r.key === f.reason)?.label ?? f.reason}</span>
                  <span className="badge badge-gray">{f.targetType}</span>
                  <span>{fmtDateTime(f.createdAt)} · reporter ip {f.ipHash?.slice(0, 8)}</span>
                  {t && (
                    <Link href={t.link} target="_blank" className="underline">
                      open
                    </Link>
                  )}
                </div>
                {f.details && <p className="text-sm mt-1">Reporter says: {f.details}</p>}
                {t ? (
                  <div className={`mt-2 p-3 rounded-lg bg-bg text-sm ${t.status !== "VISIBLE" ? "opacity-60" : ""}`}>
                    <div className="text-xs text-muted">
                      by {t.name} · currently {t.status}
                    </div>
                    <p className="whitespace-pre-line line-clamp-4">{t.text}</p>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted">Target no longer exists.</div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <form action={resolveFlag}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="action" value="HIDE" />
                    <button className="btn btn-danger btn-sm">Hide content & resolve</button>
                  </form>
                  <form action={resolveFlag}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="action" value="RESOLVE" />
                    <button className="btn btn-sm">Resolve (keep content)</button>
                  </form>
                  <form action={resolveFlag}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="action" value="DISMISS" />
                    <button className="btn btn-sm">Dismiss</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "settings" && settings && (
        <div className="space-y-3">
          <div className="card p-4 text-sm border-warn/40">
            <strong>Emergency pause:</strong> untick “Community open” and save. The feed turns read-only instantly for everyone while you clean up. Tick it again to reopen.
          </div>
          <SettingsForm s={settings} />
        </div>
      )}

      {tab === "text" && settings && <SiteTextForm s={settings} />}

      {tab === "users" && owner && <UsersPanel users={users} meId={me.id} />}

      {sp.pw === "changed" && <div className="card p-3 text-sm text-ok">Password changed.</div>}

      {tab === "log" && (
        <div className="card overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>ip</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                  <td className="text-xs mono">{l.actor ?? "-"}</td>
                  <td className="text-xs font-medium">{l.action}</td>
                  <td className="text-xs mono">{l.targetId}</td>
                  <td className="text-xs">{l.details}</td>
                  <td className="text-xs text-muted">{l.ipHash?.slice(0, 8)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-8">
                    Nothing logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "advice" && (
        <div className="space-y-3">
          {advice.length === 0 && <div className="card p-8 text-center text-muted">No guidance requests yet.</div>}
          {advice.map((r) => {
            const m = matchedAccounts.find((a) => a.id === r.matchedAccountId);
            const v = r.verdict ? VERDICTS[r.verdict] : null;
            return (
              <div key={r.id} className={`card p-4 ${r.status === "PENDING" ? "border-info/40" : ""}`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`badge ${r.status === "PENDING" ? "badge-blue" : (v?.cls ?? "badge-gray")}`}>
                    {r.status === "PENDING" ? "Awaiting answer" : v?.label}
                  </span>
                  <span className="badge badge-gray">{adviceCategoryLabel(r.category)}</span>
                  {r.identifier && <span className="badge badge-gray">{typeLabel(r.identifierType)}</span>}
                  {m && <span className="badge badge-red">Matches exposed record · {m.reportCount} reports</span>}
                  <span className="text-xs text-muted">{fmtDateTime(r.createdAt)}</span>
                </div>
                <div className="text-lg font-semibold mt-1 break-all">
                  {r.subject || r.identifier || r.websiteUrl}
                  {r.subject && r.identifier && <span className="mono text-muted text-sm ml-2">{r.identifier}</span>}
                </div>
                <div className="text-xs text-muted">
                  {[r.holderName, r.bankName, r.platform, r.amountInr ? inr(r.amountInr) + " asked" : null].filter(Boolean).join(" · ")}
                </div>
                {r.websiteUrl && <div className="text-xs mono text-muted break-all mt-1">{r.websiteUrl}</div>}
                <p className="text-sm mt-2 whitespace-pre-line">{r.description}</p>
                {r.evidence.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.evidence.map((e) => (
                      <a key={e.id} href={`/admin/evidence/${e.id}`} target="_blank" className="block border border-line rounded-lg overflow-hidden" title={e.originalName}>
                        {e.mimeType.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/admin/evidence/${e.id}`} alt={e.originalName} className="h-24 w-auto" />
                        ) : (
                          <span className="block h-24 w-24 text-xs p-2 text-muted">PDF {e.originalName}</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted mt-2">
                  Requester: {[r.contactName, r.contactEmail, r.contactPhone].filter(Boolean).join(" · ") || "no contact left"} · link{" "}
                  <Link href={`/advice/${r.token}`} className="underline" target="_blank">
                    /advice/{r.token}
                  </Link>
                </div>
                {r.status === "ANSWERED" ? (
                  <div className="mt-3 p-3 rounded-lg bg-bg text-sm whitespace-pre-line">
                    <span className="text-muted">Reply:</span> {r.adminReply}
                  </div>
                ) : (
                  <form action={answerAdvice} className="mt-3 grid sm:grid-cols-4 gap-2 items-start">
                    <input type="hidden" name="id" value={r.id} />
                    <select name="verdict" className="input" defaultValue={m ? "SCAM" : "SUSPICIOUS"}>
                      <option value="SCAM">Scam / fraud. Do not pay</option>
                      <option value="SUSPICIOUS">Suspicious. Hold</option>
                      <option value="SAFE">No red flags</option>
                      <option value="NEED_INFO">Need more info</option>
                    </select>
                    <textarea
                      name="adminReply"
                      required
                      rows={3}
                      className="input sm:col-span-3"
                      defaultValue={
                        m
                          ? `This account is already in our records as ${scamLabel(m.scamType).toLowerCase()} with ${m.reportCount} victim report(s). Do not deposit or invest any funds. If you already paid, call 1930 immediately and file at cybercrime.gov.in.`
                          : ""
                      }
                      placeholder="Your guidance to the requester"
                    />
                    <label className="flex items-center gap-2 text-xs sm:col-span-2">
                      <input type="checkbox" name="publish" />
                      Also publish to exposure board (SCAM only) as
                      <select name="scamType" className="input !py-1 !px-2 text-xs w-44" defaultValue="INVESTMENT">
                        {SCAM_TYPES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2 flex justify-end">
                      <button className="btn btn-ok btn-sm">Send verdict</button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VisibilitySelect({ id, value }: { id: string; value: string }) {
  return (
    <form action={setVisibility} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <select name="visibility" defaultValue={value} className="input !py-1 !px-2 text-xs w-24">
        <option value="FULL">Show full</option>
        <option value="MASKED">Last 4 only (UPI/bank)</option>
        <option value="HIDDEN">Hidden</option>
      </select>
      <button className="btn btn-sm">Set</button>
    </form>
  );
}
