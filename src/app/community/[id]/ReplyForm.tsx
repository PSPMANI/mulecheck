"use client";

import { useActionState, useRef } from "react";
import { createReply, type ReplyState } from "../actions";
import { POST_VERDICTS } from "@/lib/moderation";

const QUICK = ["🚨", "❌", "🛑", "⚠️", "✅", "🙏", "💸", "📵", "🤔"];

export function ReplyForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(createReply, {});
  const v = state.values ?? {};
  const ref = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const insert = (e: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    el.value = el.value.slice(0, s) + e + el.value.slice(el.selectionEnd ?? s);
    el.selectionStart = el.selectionEnd = s + e.length;
    el.focus();
  };
  return (
    <form
      key={state.n ?? 0}
      ref={formRef}
      action={action}
      className="space-y-3"
      encType="multipart/form-data"
    >
      <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="postId" value={postId} />
      <div className="flex flex-wrap gap-2">
        {POST_VERDICTS.map((pv) => (
          <label key={pv.key} className="cursor-pointer">
            <input type="radio" name="verdict" value={pv.key} defaultChecked={v.verdict === pv.key} className="peer sr-only" />
            <span className={`badge ${pv.cls} peer-checked:ring-2 peer-checked:ring-fg/60 px-3 py-1 text-xs`}>{pv.label}</span>
          </label>
        ))}
        <span className="text-xs text-muted self-center">Pick your verdict (optional)</span>
      </div>
      <textarea ref={ref} name="body" defaultValue={v.body} required rows={4} className="input" placeholder="Share your experience or advice. No links." />
      <div className="flex flex-wrap items-center gap-1">
        {QUICK.map((e) => (
          <button key={e} type="button" onClick={() => insert(e)} className="btn btn-sm text-base px-2">
            {e}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="authorName" defaultValue={v.authorName} maxLength={60} className="input" placeholder="Your display name (optional)" />
        <input name="images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="input" />
      </div>
      {state.error && <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Reply posted.</div>}
      <div className="flex justify-end">
        <button disabled={pending} className="btn btn-danger btn-sm">
          {pending ? "Posting..." : "Post reply"}
        </button>
      </div>
    </form>
  );
}
