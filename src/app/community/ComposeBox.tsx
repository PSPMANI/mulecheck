"use client";

import { useActionState, useRef } from "react";
import { createPost, type PostState } from "./actions";
import { ADVICE_CATEGORIES } from "@/lib/adviceCategories";

const QUICK = ["🚨", "❌", "🛑", "⚠️", "✅", "🙏", "💸", "📵", "🤔"];

export function ComposeBox({ placeholder, note }: { placeholder: string; note: string }) {
  const [state, action, pending] = useActionState<PostState, FormData>(createPost, {});
  const v = state.values ?? {};
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (e: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    el.value = el.value.slice(0, s) + e + el.value.slice(el.selectionEnd ?? s);
    el.selectionStart = el.selectionEnd = s + e.length;
    el.focus();
  };
  return (
    <form key={state.n ?? 0} action={action} className="card p-4 space-y-3" encType="multipart/form-data">
      <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <textarea
        ref={ref}
        name="body"
        defaultValue={v.body}
        required
        minLength={10}
        maxLength={4000}
        rows={3}
        className="input text-base"
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center gap-1">
        {QUICK.map((e) => (
          <button key={e} type="button" onClick={() => insert(e)} className="btn btn-sm text-base px-2">
            {e}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <input name="authorName" defaultValue={v.authorName} maxLength={60} className="input" placeholder="Name (optional)" />
        <select name="category" className="input" defaultValue={v.category ?? "OTHER"}>
          {ADVICE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="input sm:col-span-2" />
      </div>
      {state.error && <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">{state.error} Your text is kept. Re-attach screenshots before posting again.</div>}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-xs text-muted">{note}</span>
        <button disabled={pending} className="btn btn-danger justify-center sm:w-auto">
          {pending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
