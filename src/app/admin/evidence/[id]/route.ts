import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { evidencePath } from "@/lib/uploads";

/** Serve an uploaded evidence file to moderators only. */
export async function GET(_req: Request, ctx: RouteContext<"/admin/evidence/[id]">) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const ev = await prisma.evidence.findUnique({ where: { id } });
  if (!ev) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(evidencePath(ev.storedName));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": ev.mimeType,
        "Content-Disposition": `inline; filename="${ev.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("File missing on disk", { status: 410 });
  }
}
