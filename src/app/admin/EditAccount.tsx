"use client";

import { useState } from "react";
import type { Account } from "@prisma/client";
import { updateAccount } from "./actions";
import { SCAM_TYPES, ROLES } from "@/lib/scamTypes";

export function EditAccount({ a }: { a: Account }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-sm w-full justify-center">
        Edit
      </button>
    );
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <form
        action={async (fd) => {
          await updateAccount(fd);
          setOpen(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="card p-6 w-full max-w-xl space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <input type="hidden" name="id" value={a.id} />
        <div className="mono font-semibold break-all">{a.value}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Scam type</span>
            <select name="scamType" defaultValue={a.scamType} className="input mt-1">
              {SCAM_TYPES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted">Role</span>
            <select name="role" defaultValue={a.role} className="input mt-1">
              {ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Bank / app</span>
            <input name="bankName" defaultValue={a.bankName ?? ""} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Holder name</span>
            <input name="holderName" defaultValue={a.holderName ?? ""} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Platform</span>
            <input name="platform" defaultValue={a.platform ?? ""} className="input mt-1" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-muted">Public summary</span>
          <textarea name="summary" defaultValue={a.summary} rows={3} className="input mt-1" />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Total loss (INR)</span>
            <input name="totalAmountInr" type="number" defaultValue={a.totalAmountInr} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Tags</span>
            <input name="tags" defaultValue={a.tags} className="input mt-1" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-muted">Admin notes (private)</span>
          <textarea name="adminNotes" defaultValue={a.adminNotes ?? ""} rows={2} className="input mt-1" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-sm">
            Cancel
          </button>
          <button className="btn btn-ok btn-sm">Save</button>
        </div>
      </form>
    </div>
  );
}
