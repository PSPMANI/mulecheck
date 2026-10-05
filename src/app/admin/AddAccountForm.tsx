"use client";

import { useActionState } from "react";
import { addAccount, type AddState } from "./actions";
import { ACCOUNT_TYPES, SCAM_TYPES, ROLES } from "@/lib/scamTypes";

export function AddAccountForm() {
  const [state, action, pending] = useActionState<AddState, FormData>(addAccount, {});
  return (
    <form action={action} className="card p-6 space-y-4 max-w-2xl">
      <p className="text-sm text-muted">Adds a verified account and publishes it in today&apos;s exposure immediately.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-muted">Type</span>
          <select name="type" className="input mt-1" defaultValue="BANK">
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-muted">Identifier</span>
          <input name="value" required className="input mt-1 mono" />
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-muted">Scam type</span>
          <select name="scamType" className="input mt-1" defaultValue="INVESTMENT">
            {SCAM_TYPES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Role</span>
          <select name="role" className="input mt-1" defaultValue="MULE">
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Public visibility</span>
          <select name="visibility" className="input mt-1" defaultValue="MASKED">
            <option value="FULL">Show full</option>
            <option value="MASKED">Last 4 only (UPI/bank)</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs text-muted">Bank / app</span>
          <input name="bankName" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Holder name</span>
          <input name="holderName" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Platform</span>
          <input name="platform" className="input mt-1" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-muted">Summary (public)</span>
        <textarea name="summary" rows={3} className="input mt-1" required />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-muted">Total loss (INR)</span>
          <input name="totalAmountInr" type="number" min={0} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Tags (comma separated)</span>
          <input name="tags" className="input mt-1" placeholder="telegram, fake-app, hyderabad" />
        </label>
      </div>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Added and published.</div>}
      <button disabled={pending} className="btn btn-danger">
        {pending ? "Saving…" : "Add & publish"}
      </button>
    </form>
  );
}
