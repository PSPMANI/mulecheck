"use client";

import { useActionState, useRef } from "react";
import { addComment, toggleReaction, type CommentState } from "./actions";
import { fmtDateTime } from "@/lib/format";
import { FlagButton } from "@/components/FlagButton";

const EMOJIS = ["😡", "⚠️", "💸", "🙏", "👍", "😢"];
const QUICK = ["🚨", "❌", "🛑", "💔", "🤬", "🙏", "💸", "🔒", "✅", "📵"];

type C = { id: string; name: string; body: string; createdAt: string | Date };

export function Reactions({ accountId, counts, mine }: { accountId: string; counts: Record<string, number>; mine: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOJIS.map((e) => {
        const active = mine.includes(e);
        return (
          <form key={e} action={toggleReaction}>
            <input type="hidden" name="accountId" value={accountId} />
            <input type="hidden" name="emoji" value={e} />
            <button
              className={`btn btn-sm text-base ${active ? "border-danger bg-danger/20" : ""}`}
              title={active ? "Remove reaction" : "React"}
              aria-pressed={active}
            >
              <span>{e}</span>
              <span className="text-xs tabular-nums text-muted">{counts[e] ?? 0}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}

export function CommentForm({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment, {});
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (e: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const t = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, s) + e + el.value.slice(t);
    el.selectionStart = el.selectionEnd = s + e.length;
    el.focus();
  };
  return (
    <form action={action} className="space-y-3">
      <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="accountId" value={accountId} />
      <div className="grid sm:grid-cols-4 gap-2">
        <input name="name" className="input" placeholder="Your name (optional)" maxLength={60} />
        <textarea ref={ref} name="body" rows={3} required className="input sm:col-span-3" placeholder="Share what happened to you, or warn others 🚨" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted mr-1">Add emoji:</span>
        {QUICK.map((e) => (
          <button key={e} type="button" onClick={() => insert(e)} className="btn btn-sm text-base px-2">
            {e}
          </button>
        ))}
      </div>
      {state.error && <div className="text-sm text-danger">{state.error}</div>}
      {state.ok && <div className="text-sm text-ok">Posted.</div>}
      <div className="flex justify-end">
        <button disabled={pending} className="btn btn-danger btn-sm">
          {pending ? "Posting..." : "Post comment"}
        </button>
      </div>
    </form>
  );
}

export function CommentList({ comments }: { comments: C[] }) {
  if (comments.length === 0) return <p className="text-sm text-muted">No comments yet. Be the first to warn others.</p>;
  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="rounded-lg bg-bg p-3">
          <div className="text-xs text-muted flex items-center gap-3">
            <span>
              <span className="text-fg font-medium">{c.name}</span> · {fmtDateTime(c.createdAt)}
            </span>
            <FlagButton targetType="COMMENT" targetId={c.id} />
          </div>
          <p className="text-sm mt-1 whitespace-pre-line">{highlight(c.body)}</p>
        </li>
      ))}
    </ul>
  );
}

const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/gu;

/** Wrap emojis so they render larger and stand out in comments. */
function highlight(text: string) {
  const parts = text.split(EMOJI_RE);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className="inline-block text-lg leading-none align-middle mx-0.5 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
