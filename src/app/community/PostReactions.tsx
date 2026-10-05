"use client";

import { togglePostReaction } from "./actions";

export const POST_EMOJIS = ["🚨", "😡", "⚠️", "💸", "🙏", "👍", "😢", "🤔"];

/** One-tap reactions for people who cannot or do not want to type a reply. */
export function PostReactions({ postId, counts, mine }: { postId: string; counts: Record<string, number>; mine: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {POST_EMOJIS.map((e) => {
        const active = mine.includes(e);
        const n = counts[e] ?? 0;
        return (
          <form key={e} action={togglePostReaction}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="emoji" value={e} />
            <button
              className={`btn btn-sm text-base px-2 ${active ? "border-danger bg-danger/20" : ""}`}
              title={active ? "Remove your reaction" : "React"}
              aria-pressed={active}
            >
              <span>{e}</span>
              {n > 0 && <span className="text-xs tabular-nums text-muted">{n}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}
