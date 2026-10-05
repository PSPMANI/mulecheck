/**
 * Wipe all content (accounts, reports, evidence, advice, community, comments, reactions, flags)
 * and delete uploaded files. Keeps admin sessions and the audit log.
 * Usage: npm run wipe
 */
import { PrismaClient } from "@prisma/client";
import { readdir, unlink } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

async function main() {
  const counts = await prisma.$transaction([
    prisma.flag.deleteMany(),
    prisma.postReaction.deleteMany(),
    prisma.communityImage.deleteMany(),
    prisma.communityReply.deleteMany(),
    prisma.communityPost.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.evidence.deleteMany(),
    prisma.adviceRequest.deleteMany(),
    prisma.report.deleteMany(),
    prisma.account.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.presence.deleteMany(),
  ]);
  const labels = ["flags", "post reactions", "community images", "replies", "posts", "reactions", "comments", "evidence", "advice", "reports", "accounts", "login attempts", "presence"];
  counts.forEach((c, i) => console.log(`${labels[i]}: ${c.count}`));

  let files = 0;
  try {
    for (const f of await readdir(UPLOAD_DIR)) {
      await unlink(path.join(UPLOAD_DIR, f));
      files++;
    }
  } catch {}
  console.log(`upload files removed: ${files}`);
  await prisma.adminLog.create({ data: { action: "WIPE_ALL_DATA", details: `removed ${files} files` } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
