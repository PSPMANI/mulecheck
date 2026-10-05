"use client";

import { useActionState } from "react";
import { importCsv } from "../actions";

type S = { error?: string; ok?: boolean; imported?: number; skipped?: string[] };

export function ImportForm() {
  const [state, action, pending] = useActionState<S, FormData>(importCsv, {});
  return (
    <form action={action} className="card p-6 space-y-4">
      <label className="block">
        <span className="text-xs text-muted">CSV file</span>
        <input name="file" type="file" accept=".csv,text/csv" className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-xs text-muted">…or paste CSV</span>
        <textarea name="csv" rows={8} className="input mt-1 mono text-xs" placeholder="type,value,scamType,role,summary,amountInr&#10;UPI,fraud@okaxis,TASK_JOB,MULE,Received task-job deposits,45000" />
      </label>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" defaultChecked />
          Publish immediately (approved + exposed)
        </label>
        <label className="flex items-center gap-2 text-sm">
          Default visibility
          <select name="defaultVisibility" className="input !py-1 w-32" defaultValue="MASKED">
            <option value="FULL">Show full</option>
            <option value="MASKED">Last 4 only (UPI/bank)</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </label>
      </div>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && (
        <div className="text-sm">
          <div className="text-ok">Imported {state.imported} rows.</div>
          {state.skipped && state.skipped.length > 0 && (
            <details className="mt-2 text-muted">
              <summary>{state.skipped.length} skipped</summary>
              <ul className="list-disc pl-5 mt-1 text-xs">
                {state.skipped.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <button disabled={pending} className="btn btn-danger">
        {pending ? "Importing…" : "Import"}
      </button>
    </form>
  );
}
