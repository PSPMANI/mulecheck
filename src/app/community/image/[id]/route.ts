import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { evidencePath } from "@/lib/uploads";

/** Public community images. Only served while the parent post (and reply) is visible. */
export async function GET(_req: Request, ctx: RouteContext<"/community/image/[id]">) {
  const { id } = await ctx.params;
  const im = await prisma.communityImage.findUnique({ where: { id }, include: { post: { select: { status: true } }, reply: { select: { status: true } } } });
  if (!im || im.post.status !== "VISIBLE" || (im.reply && im.reply.status !== "VISIBLE")) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(evidencePath(im.storedName));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": im.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Missing", { status: 410 });
  }
}
