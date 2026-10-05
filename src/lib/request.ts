import { headers } from "next/headers";
import { createHash } from "crypto";

/** Hashed client IP and raw user agent, stored with every submission for the police case file. */
export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const ipHash = createHash("sha256").update(ip + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  return { ipHash, userAgent };
}
