import Link from "next/link";
import type { CommunityPost, CommunityReply, CommunityImage, PostReaction } from "@prisma/client";
import { requestMeta } from "@/lib/request";
import { PostReactions } from "./PostReactions";
import { fmtDateTime } from "@/lib/format";
import { adviceCategoryLabel } from "@/lib/adviceCategories";
import { POST_VERDICTS, postVerdict } from "@/lib/moderation";
import { FlagButton } from "@/components/FlagButton";
import { ReplyForm } from "./[id]/ReplyForm";

type Reply = CommunityReply & { images: CommunityImage[] };
type Post = CommunityPost & { images: CommunityImage[]; replies: Reply[]; reactions: PostReaction[] };

const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/gu;
function rich(text: string) {
  return text.split(EMOJI_RE).map((p, i) => (i % 2 === 1 ? <span key={i} className="inline-block text-lg leading-none align-middle mx-0.5">{p}</span> : <span key={i}>{p}</span>));
}

/** One post with its thread. `full` shows every reply; otherwise the last 3 plus a link. */
export async function PostCard({ p, full = false, canReply = true, canReact = true }: { p: Post; full?: boolean; canReply?: boolean; canReact?: boolean }) {
  const { ipHash } = await requestMeta();
  const rc: Record<string, number> = {};
  const mine: string[] = [];
  for (const r of p.reactions) {
    rc[r.emoji] = (rc[r.emoji] ?? 0) + 1;
    if (r.ipHash === ipHash) mine.push(r.emoji);
  }
  const tally: Record<string, number> = {};
  for (const r of p.replies) if (r.verdict) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const shown = full ? p.replies : p.replies.slice(-3);
  const hidden = p.replies.length - shown.length;

  return (
    <article className="card p-4 sm:p-5 space-y-3">
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="h-8 w-8 rounded-full bg-bg3 flex items-center justify-center text-sm font-bold text-fg">{p.authorName.slice(0, 1).toUpperCase()}</span>
        <span className="text-fg font-medium">{p.authorName}</span>
        <span>· {fmtDateTime(p.createdAt)}</span>
        <span className="badge badge-gray">{adviceCategoryLabel(p.category)}</span>
        {p.pinned && <span className="badge badge-blue">Pinned</span>}
        <span className="ml-auto">
          <FlagButton targetType="POST" targetId={p.id} />
        </span>
      </header>

      <Link href={`/community/${p.id}`} className="block">
        <p className="whitespace-pre-line break-words text-[15px] leading-relaxed">{rich(p.body)}</p>
      </Link>
      {p.images.length > 0 && (
        <div className={`grid gap-2 ${p.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {p.images.map((im) => (
            <a key={im.id} href={`/community/image/${im.id}`} target="_blank" className="block rounded-lg overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/community/image/${im.id}`} alt={im.originalName} className="w-full max-h-96 object-cover" />
            </a>
          ))}
        </div>
      )}

      {canReact ? <PostReactions postId={p.id} counts={rc} mine={mine} /> : <div className="text-xs text-muted">Reactions paused.</div>}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link href={`/community/${p.id}`} className="text-muted hover:text-fg">
          💬 {p.replyCount} {p.replyCount === 1 ? "reply" : "replies"}
        </Link>
        {total > 0 &&
          POST_VERDICTS.filter((v) => tally[v.key]).map((v) => (
            <span key={v.key} className={`badge ${v.cls}`}>
              {v.label} {tally[v.key]}
            </span>
          ))}
      </div>

      {shown.length > 0 && (
        <div className="space-y-2 border-l-2 border-line pl-3 sm:pl-4">
          {hidden > 0 && (
            <Link href={`/community/${p.id}`} className="text-xs text-info hover:underline">
              View {hidden} earlier {hidden === 1 ? "reply" : "replies"}
            </Link>
          )}
          {shown.map((r) => {
            const v = postVerdict(r.verdict);
            return (
              <div key={r.id} className={`rounded-lg p-3 ${r.isModerator ? "bg-info/10 border border-info/40" : "bg-bg"}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className={`font-medium ${r.isModerator ? "text-info" : "text-fg"}`}>{r.authorName}</span>
                  {r.isModerator && <span className="badge badge-blue">Admin</span>}
                  {v && <span className={`badge ${v.cls}`}>{v.label}</span>}
                  <span>{fmtDateTime(r.createdAt)}</span>
                  {!r.isModerator && (
                    <span className="ml-auto">
                      <FlagButton targetType="REPLY" targetId={r.id} />
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1 whitespace-pre-line break-words">{rich(r.body)}</p>
                {r.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.images.map((im) => (
                      <a key={im.id} href={`/community/image/${im.id}`} target="_blank">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/community/image/${im.id}`} alt={im.originalName} className="h-24 rounded-lg border border-line" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canReply ? (
        <details className="group" open={full}>
          <summary className="cursor-pointer text-sm text-info hover:underline list-none">↩ Reply to this post</summary>
          <div className="mt-3">
            <ReplyForm postId={p.id} />
          </div>
        </details>
      ) : (
        <div className="text-xs text-muted">Replies are paused by the admin.</div>
      )}
    </article>
  );
}
