"use client";

import { useActionState, useState } from "react";
import { flagContent, type FlagState } from "@/app/community/flag/actions";
import { FLAG_REASONS } from "@/lib/moderation";

export function FlagButton({ targetType, targetId, small = true }: { targetType: "POST" | "REPLY" | "COMMENT"; targetId: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FlagState, FormData>(flagContent, {});
  if (state.ok) return <span className="text-xs text-ok">Reported to admin. Thank you.</span>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`text-muted hover:text-danger ${small ? "text-xs" : "text-sm"}`} title="Report this user to admin">
        ⚑ Report to admin
      </button>
    );
  return (
    <form action={action} className="mt-2 rounded-lg border border-line bg-bg p-3 space-y-2 text-sm">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <div className="font-medium">Why are you reporting this?</div>
      <select name="reason" className="input !py-1" defaultValue="BOT">
        {FLAG_REASONS.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
      <input name="details" className="input !py-1" placeholder="Anything else the admin should know (optional)" maxLength={500} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-sm">
          Cancel
        </button>
        <button disabled={pending} className="btn btn-danger btn-sm">
          {pending ? "Sending..." : "Send report"}
        </button>
      </div>
    </form>
  );
}
