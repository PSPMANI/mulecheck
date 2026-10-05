import Link from "next/link";
import { AdviceForm } from "./AdviceForm";
import { getSettings } from "@/lib/settings";

export default async function AdvicePage({ searchParams }: PageProps<"/advice">) {
  const sp = await searchParams;
  const identifier = typeof sp.identifier === "string" ? sp.identifier : "";
  const settings = await getSettings();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-warn font-semibold">{settings.adviceKicker}</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{settings.adviceTitle}</h1>
        <p className="text-muted mt-1 whitespace-pre-line">{settings.adviceSub}</p>
      </div>
      <div className="card p-4 text-sm">
        Already sure it is a scam?{" "}
        <Link href="/report" className="underline text-danger">
          Report it directly
        </Link>{" "}
        so it can be published to the community after review.
      </div>
      {settings.adviceOpen ? (
        <AdviceForm defaultIdentifier={identifier} />
      ) : (
        <div className="card p-6 border-warn/50">Guidance requests are paused by the admin right now. Meanwhile: do not pay, do not share OTPs, and search the account on the Check page.</div>
      )}
    </div>
  );
}
