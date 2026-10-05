import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import dataset (CSV)</h1>
        <p className="text-sm text-muted mt-1">
          Load your curated mule/scam account list. Existing identifiers get their report count incremented instead of duplicating.
        </p>
      </div>
      <div className="card p-4 text-xs">
        <div className="font-semibold mb-1">Columns (header row required, order free, case-insensitive)</div>
        <code className="mono block whitespace-pre-wrap text-muted">
          type,value,scamType,role,summary,bankName,holderName,platform,amountInr,visibility,exposedOn,tags,reportCount
        </code>
        <div className="text-muted mt-2 space-y-1">
          <div>type: PHONE UPI BANK CRYPTO WEBSITE EMAIL SOCIAL APP · role: MULE SCAMMER PHISHING FAKE_APP</div>
          <div>scamType: DIGITAL_ARREST INVESTMENT TASK_JOB LOAN_APP UPI_FRAUD OTP_KYC PHISHING SEXTORTION ROMANCE OLX_MARKETPLACE COURIER_CUSTOMS LOTTERY_PRIZE ELECTRICITY_BILL CRYPTO_SCAM IMPERSONATION OTHER</div>
          <div>visibility: FULL MASKED HIDDEN · exposedOn: YYYY-MM-DD (defaults to today)</div>
          <div>Columns are listed above.</div>
        </div>
      </div>
      <ImportForm />
    </div>
  );
}
