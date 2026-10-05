"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "./actions";
import type { Settings } from "@/lib/settings";

const SWITCHES: { key: keyof Settings; label: string; desc: string }[] = [
  { key: "communityOpen", label: "Community open", desc: "Master switch. Off = the whole feed becomes read-only: no posts, replies or reactions." },
  { key: "communityPosts", label: "Allow new posts", desc: "Users can create posts in the feed." },
  { key: "communityReplies", label: "Allow replies", desc: "Users can reply under posts and vote a verdict." },
  { key: "communityReactions", label: "Allow emoji reactions", desc: "One-tap emoji on posts." },
  { key: "commentsOpen", label: "Allow comments on exposed accounts", desc: "Comments and reactions under each exposure page." },
  { key: "reportsOpen", label: "Accept scam reports", desc: "The public Report form. Off shows a notice and hides the form." },
  { key: "adviceOpen", label: "Accept guidance requests", desc: "The Ask before you pay form." },
];

export function SettingsForm({ s }: { s: Settings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettings, {});
  return (
    <form action={action} className="space-y-4 max-w-3xl">
      <div className="card p-5 space-y-2">
        <div className="font-semibold mb-1">Switches</div>
        {SWITCHES.map((sw) => (
          <label key={sw.key} className="flex items-center justify-between gap-4 text-sm cursor-pointer rounded-lg border border-line px-4 py-3 hover:bg-bg3">
            <span>
              <span className="font-semibold">{sw.label}</span>
              <span className="block text-xs text-muted mt-0.5">{sw.desc}</span>
            </span>
            <input type="checkbox" name={sw.key} defaultChecked={s[sw.key] as boolean} className="toggle" />
          </label>
        ))}
      </div>
      <div className="card p-5 space-y-3">
        <label className="block">
          <span className="font-semibold">Message shown when the community is paused</span>
          <textarea name="communityMessage" defaultValue={s.communityMessage} rows={2} className="input mt-2" />
        </label>
        <label className="block">
          <span className="font-semibold">Site-wide announcement</span>
          <span className="block text-xs text-muted">Shown as a banner on every page. Leave empty to hide. Example: Heavy scam wave on fake courier calls today, do not answer video calls from unknown numbers.</span>
          <textarea name="announcement" defaultValue={s.announcement} rows={2} className="input mt-2" />
        </label>
      </div>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Saved. Changes are live immediately.</div>}
      <div className="flex gap-2">
        <button disabled={pending} className="btn btn-danger">
          {pending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
