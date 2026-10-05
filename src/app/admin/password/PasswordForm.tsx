"use client";

import { useActionState } from "react";
import { changeOwnPassword, type UserState } from "../users/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<UserState, FormData>(changeOwnPassword, {});
  return (
    <form action={action} className="card p-6 mt-4 space-y-4">
      <label className="block">
        <span className="text-xs text-muted">Current password</span>
        <input name="current" type="password" required autoComplete="current-password" className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-xs text-muted">New password (12+ characters, mixed)</span>
        <input name="next" type="password" required minLength={12} autoComplete="new-password" className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-xs text-muted">Repeat new password</span>
        <input name="repeat" type="password" required minLength={12} autoComplete="new-password" className="input mt-1" />
      </label>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Password changed.</div>}
      <button disabled={pending} className="btn btn-danger w-full justify-center">
        {pending ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
