"use client";

import { useActionState } from "react";
import { updateSiteText, type SettingsState } from "./actions";
import { TEXT_FIELDS, type SiteText } from "@/lib/siteText";

export function SiteTextForm({ s }: { s: SiteText }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSiteText, {});
  return (
    <form action={action} className="space-y-4 max-w-3xl">
      <div className="card p-4 text-sm text-muted">
        Edit any text below and save. Leave a field empty to go back to the default wording. Changes are live immediately on every page.
      </div>
      <div className="card p-5 space-y-4">
        {TEXT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-muted">{f.label}</span>
            {f.rows === 1 ? (
              <input name={f.key} defaultValue={s[f.key]} className="input mt-1" />
            ) : (
              <textarea name={f.key} defaultValue={s[f.key]} rows={f.rows} className="input mt-1" />
            )}
          </label>
        ))}
      </div>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Saved. The new wording is live.</div>}
      <div className="sticky bottom-4">
        <button disabled={pending} className="btn btn-danger shadow-lg">
          {pending ? "Saving..." : "Save all text"}
        </button>
      </div>
    </form>
  );
}
