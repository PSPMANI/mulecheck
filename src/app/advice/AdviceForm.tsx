"use client";

import { useActionState, useState } from "react";
import { submitAdvice, type AdviceState } from "./actions";
import { ACCOUNT_TYPES } from "@/lib/scamTypes";
import { ADVICE_CATEGORIES } from "@/lib/adviceCategories";

export function AdviceForm({ defaultIdentifier }: { defaultIdentifier: string }) {
  const [state, action, pending] = useActionState<AdviceState, FormData>(submitAdvice, {});
  const v = state.values ?? {};
  const [category, setCategory] = useState(v.category ?? (defaultIdentifier ? "PAYMENT_ACCOUNT" : "EARNING_APP"));
  const isPayment = category === "PAYMENT_ACCOUNT";

  return (
    <form key={state.n ?? 0} action={action} className="card p-6 space-y-5" encType="multipart/form-data">
      <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <label className="block">
        <span className="text-xs text-muted">What do you want checked? *</span>
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1">
          {ADVICE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-muted">{isPayment ? "Who is asking you to pay? (company / person / group)" : "Name of the app, platform, scheme or person *"}</span>
          <input name="subject" defaultValue={v.subject} required={!isPayment} className="input mt-1" placeholder="e.g. Zeniq Trade Pro, QuickTask Jobs, Rahul from HR" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Website, app link, Play Store link or group invite</span>
          <input name="websiteUrl" defaultValue={v.websiteUrl} type="url" className="input mt-1 mono" placeholder="https://..." />
        </label>
      </div>

      <fieldset className="rounded-lg border border-line p-4 space-y-3">
        <legend className="text-xs text-muted px-1">{isPayment ? "Account you were asked to pay *" : "Any account, number or handle they gave you (optional)"}</legend>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Type</span>
            <select name="identifierType" className="input mt-1" defaultValue={v.identifierType ?? (isPayment ? "UPI" : "PHONE")}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted">Account / UPI / number / handle</span>
            <input name="identifier" defaultValue={v.identifier ?? defaultIdentifier} required={isPayment} className="input mt-1 mono" placeholder="Paste exactly as given to you" />
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Name on account</span>
            <input name="holderName" defaultValue={v.holderName} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Bank / app</span>
            <input name="bankName" defaultValue={v.bankName} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Where did they contact you?</span>
            <input name="platform" defaultValue={v.platform} className="input mt-1" placeholder="WhatsApp, Telegram, Instagram, call" />
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs text-muted">What is the offer, promise or request? *</span>
        <textarea
          name="description"
          defaultValue={v.description}
          required
          rows={5}
          className="input mt-1"
          placeholder="How did you find it, what do they promise (returns, salary, tasks), what are they asking you to do or pay, any deadlines or pressure."
        />
      </label>

      <label className="block">
        <span className="text-xs text-muted">Attach screenshots (chat, app, offer, payment page). Up to 8 files, 8 MB each. *</span>
        <input name="screenshots" type="file" multiple required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="input mt-1" />
        <span className="text-xs text-muted">Screenshots help the moderator give a precise answer. They are stored privately and never published.</span>
      </label>

      <div className="grid sm:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-xs text-muted">Amount asked / invested (INR)</span>
          <input name="amountInr" defaultValue={v.amountInr} type="number" min={0} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Your name</span>
          <input name="contactName" defaultValue={v.contactName} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Your email</span>
          <input name="contactEmail" defaultValue={v.contactEmail} type="email" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Your WhatsApp</span>
          <input name="contactPhone" defaultValue={v.contactPhone} className="input mt-1" />
        </label>
      </div>

      {state.error && <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">{state.error} Your text is kept. Re-attach screenshots before sending again.</div>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">You will get a private link to see the moderator&apos;s answer. Your contact details and screenshots are never published.</p>
        <button disabled={pending} className="btn btn-danger">
          {pending ? "Uploading and sending..." : "Ask for guidance"}
        </button>
      </div>
    </form>
  );
}
