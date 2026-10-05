import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { evidencePath } from "@/lib/uploads";

/** Moderator view of a community image regardless of post visibility. */
export async function GET(_req: Request, ctx: RouteContext<"/admin/evidence/c/[id]">) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const im = await prisma.communityImage.findUnique({ where: { id } });
  if (!im) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(evidencePath(im.storedName));
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": im.mimeType, "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Missing", { status: 410 });
  }
}
