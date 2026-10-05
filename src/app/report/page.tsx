import { ReportForm } from "./ReportForm";
import { getSettings } from "@/lib/settings";

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : "PHONE";
  const value = typeof sp.value === "string" ? sp.value : "";
  const settings = await getSettings();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{settings.reportTitle}</h1>
        <p className="text-muted mt-1">{settings.reportSub}</p>
      </div>
      <div className="card p-4 text-sm border-warn/40 whitespace-pre-line">{settings.reportUrgent}</div>
      {settings.reportsOpen ? (
        <ReportForm defaultType={type} defaultValue={value} />
      ) : (
        <div className="card p-6 border-warn/50">Reports are paused by the admin right now. Please come back later. If you lost money, call 1930 and file at cybercrime.gov.in.</div>
      )}
    </div>
  );
}
