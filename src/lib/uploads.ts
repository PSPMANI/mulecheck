import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EVIDENCE_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

export type StoredFile = { storedName: string; originalName: string; mimeType: string; sizeBytes: number; sha256: string; kind: string };
export type SaveResult = { saved: number; rejected: string[] };

/** Write uploaded files from a FormData field to the private upload dir. Returns metadata for each stored file. */
export async function storeFiles(fd: FormData, field: string, opts: { allowed: Set<string>; maxFiles: number }): Promise<{ files: StoredFile[]; rejected: string[] }> {
  const files = fd.getAll(field).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
  const rejected: string[] = [];
  const out: StoredFile[] = [];
  if (files.length === 0) return { files: out, rejected };
  await mkdir(UPLOAD_DIR, { recursive: true });
  for (const f of files.slice(0, opts.maxFiles)) {
    if (!opts.allowed.has(f.type)) {
      rejected.push(`${f.name}: only ${[...opts.allowed].map((t) => t.split("/")[1].toUpperCase()).join(", ")} allowed`);
      continue;
    }
    if (f.size > MAX_BYTES) {
      rejected.push(`${f.name}: larger than 8 MB`);
      continue;
    }
    const buf = Buffer.from(await f.arrayBuffer());
    // Reject files whose bytes do not look like the declared image type (blocks renamed APKs / executables).
    if (!sniffOk(buf, f.type)) {
      rejected.push(`${f.name}: file content does not match its type`);
      continue;
    }
    const sha256 = createHash("sha256").update(buf).digest("hex");
    const ext = f.type === "application/pdf" ? "pdf" : f.type.split("/")[1].replace("jpeg", "jpg");
    const storedName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, storedName), buf);
    out.push({ storedName, originalName: f.name.slice(0, 200), mimeType: f.type, sizeBytes: f.size, sha256, kind: f.type === "application/pdf" ? "DOCUMENT" : "SCREENSHOT" });
  }
  if (files.length > opts.maxFiles) rejected.push(`Only the first ${opts.maxFiles} files were kept.`);
  return { files: out, rejected };
}

function sniffOk(buf: Buffer, mime: string): boolean {
  const h = buf.subarray(0, 12);
  switch (mime) {
    case "image/png":
      return h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
    case "image/jpeg":
      return h[0] === 0xff && h[1] === 0xd8;
    case "image/gif":
      return h.subarray(0, 3).toString("ascii") === "GIF";
    case "image/webp":
      return h.subarray(0, 4).toString("ascii") === "RIFF" && h.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf":
      return h.subarray(0, 4).toString("ascii") === "%PDF";
    default:
      return false;
  }
}

/** Persist evidence screenshots/documents and attach them to a report or advice request (private, moderators only). */
export async function saveEvidence(fd: FormData, field: string, link: { reportId?: string; adviceId?: string }): Promise<SaveResult> {
  const { files, rejected } = await storeFiles(fd, field, { allowed: EVIDENCE_TYPES, maxFiles: 8 });
  for (const f of files) await prisma.evidence.create({ data: { ...link, ...f } });
  return { saved: files.length, rejected };
}

/** Persist public community images (images only, no PDFs). */
export async function saveCommunityImages(fd: FormData, field: string, postId: string, replyId?: string): Promise<SaveResult> {
  const { files, rejected } = await storeFiles(fd, field, { allowed: IMAGE_TYPES, maxFiles: 4 });
  for (const f of files) {
    await prisma.communityImage.create({
      data: { postId, replyId: replyId ?? null, storedName: f.storedName, originalName: f.originalName, mimeType: f.mimeType, sizeBytes: f.sizeBytes, sha256: f.sha256 },
    });
  }
  return { saved: files.length, rejected };
}

export function evidencePath(storedName: string) {
  const safe = path.basename(storedName);
  return path.join(UPLOAD_DIR, safe);
}
