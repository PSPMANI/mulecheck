import { prisma } from "@/lib/prisma";
import { LiveRefresh } from "@/components/LiveRefresh";
import { adminOnline } from "@/lib/presence";
import { getSettings, canPost, canReply, canReact } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import { ComposeBox } from "./ComposeBox";
import { PostCard } from "./PostCard";

export const dynamic = "force-dynamic";

export default async function Community({ searchParams }: PageProps<"/community">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const [settings, admin] = await Promise.all([getSettings(), isAdmin()]);
  const [posts, online] = await Promise.all([
    prisma.communityPost.findMany({
      where: { status: "VISIBLE", ...(q ? { OR: [{ title: { contains: q } }, { body: { contains: q } }] } : {}) },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        images: { where: { replyId: null } },
        replies: { where: { status: "VISIBLE" }, orderBy: { createdAt: "asc" }, include: { images: true } },
        reactions: true,
      },
    }),
    adminOnline(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-info font-semibold">Community</span>
            <LiveRefresh seconds={20} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{settings.communityTitle}</h1>
          <p className="text-sm text-muted mt-1 whitespace-pre-line">{settings.communitySub}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-ok pulse" : "bg-muted"}`} />
          {online ? "Admin is online and replying" : "Admin offline, replies when back"}
        </span>
      </div>

      {!settings.communityOpen && (
        <div className="card p-5 border-warn/60 bg-warn/10">
          <div className="text-xs uppercase tracking-widest text-warn font-semibold">Community paused</div>
          <p className="mt-1">{settings.communityMessage}</p>
        </div>
      )}
      {settings.communityOpen && !settings.communityPosts && !admin && (
        <div className="card p-4 text-sm border-warn/40">New posts are paused by the admin right now. You can still read and reply.</div>
      )}
      {(canPost(settings) || admin) && <ComposeBox placeholder={settings.communityComposePlaceholder} note={settings.communityComposeNote} />}

      <form action="/community" className="flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Search the feed (app name, company, city)" />
        <button className="btn">Search</button>
      </form>

      {posts.length === 0 ? (
        <div className="card p-8 text-center text-muted">No posts yet. Start the discussion.</div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} p={p} canReply={canReply(settings) || admin} canReact={canReact(settings)} />
          ))}
        </div>
      )}
    </div>
  );
}
