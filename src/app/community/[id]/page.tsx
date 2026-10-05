import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LiveRefresh } from "@/components/LiveRefresh";
import { PostCard } from "../PostCard";
import { getSettings, canReply, canReact } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PostPage({ params, searchParams }: PageProps<"/community/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      images: { where: { replyId: null } },
      replies: { where: { status: "VISIBLE" }, orderBy: { createdAt: "asc" }, include: { images: true } },
      reactions: true,
    },
  });
  if (!p || p.status !== "VISIBLE") notFound();
  const [settings, admin] = await Promise.all([getSettings(), isAdmin()]);
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/community" className="text-sm text-muted hover:text-fg">
          ← Back to the feed
        </Link>
        <LiveRefresh seconds={20} />
      </div>
      {sp.imgwarn && <div className="card p-3 text-sm border-warn/50">Some images were not accepted (only PNG, JPG, WEBP, GIF up to 8 MB). The post itself was published.</div>}
      {!settings.communityOpen && <div className="card p-4 text-sm border-warn/60 bg-warn/10">{settings.communityMessage}</div>}
      <PostCard p={p} full canReply={canReply(settings) || admin} canReact={canReact(settings)} />
      <div className="card p-4 text-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted">Lost money to this already? Put it on the exposure board so it reaches police case files.</span>
        <Link href="/report" className="btn btn-danger btn-sm">
          Report it
        </Link>
      </div>
    </div>
  );
}
