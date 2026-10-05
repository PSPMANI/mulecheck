import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLIC_WHERE } from "@/lib/queries";
import { SCAM_TYPES } from "@/lib/scamTypes";
import { inr } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const RED_FLAGS = [
  "Anyone asking you to pay to receive money, a prize, a job or a refund.",
  "Police, CBI, ED, customs or TRAI calling or video-calling you. They never do this.",
  "Pressure to act within minutes, keep the call secret, or stay on video.",
  "A UPI collect request or QR code to receive money. Scanning or approving always sends money.",
  "Being asked to install AnyDesk, TeamViewer or an APK sent on WhatsApp.",
  "Guaranteed returns, insider stock tips, or a trading app not on Play Store or App Store.",
  "A bank account in an individual's name for a company payment.",
];

export default async function Scams() {
  const s = await getSettings();
  const grouped = await prisma.account.groupBy({
    by: ["scamType"],
    where: PUBLIC_WHERE,
    _count: { _all: true },
    _sum: { totalAmountInr: true },
  });
  const byKey = new Map(grouped.map((g) => [g.scamType, g]));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{s.scamsTitle}</h1>
        <p className="text-muted mt-1">{s.scamsSub}</p>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-3">Universal red flags</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {RED_FLAGS.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-danger">▲</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SCAM_TYPES.filter((s) => s.key !== "OTHER").map((s) => {
          const g = byKey.get(s.key);
          return (
            <div key={s.key} className="card p-5 flex flex-col">
              <div className="font-semibold">{s.label}</div>
              <p className="text-sm text-muted mt-1 flex-1">{s.desc}</p>
              <div className="mt-3 text-xs text-muted flex gap-3">
                <span>{g?._count._all ?? 0} exposed</span>
                {g?._sum.totalAmountInr ? <span>{inr(g._sum.totalAmountInr)} lost</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6 text-sm space-y-2">
        <h2 className="font-semibold">What is a mule account?</h2>
        <p className="text-muted">
          A mule account is a bank account, UPI ID or wallet used to receive and quickly move stolen money so it cannot be traced back to the scammer. Mules
          are often students, gig workers or villagers who rented out their account for a few thousand rupees, or victims of KYC fraud whose accounts were
          opened without their knowledge. Money typically hops through several mule accounts within minutes, then exits as cash, crypto or gift cards.
        </p>
        <p className="text-muted">
          Because of this, listings here identify accounts used in fraud, not necessarily the people who committed it. Report quickly to 1930 so banks can
          freeze funds before the next hop.
        </p>
        <Link href="/report" className="btn btn-danger btn-sm mt-2 self-start">
          Report an account
        </Link>
      </div>
    </div>
  );
}
