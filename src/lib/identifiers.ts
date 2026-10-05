import { createHash } from "crypto";

/** Normalize an identifier so the same account reported in different formats dedupes. */
export function normalize(type: string, raw: string): string {
  let v = raw.trim();
  switch (type) {
    case "PHONE": {
      let d = v.replace(/\D/g, "");
      if (d.length > 10 && d.startsWith("91")) d = d.slice(-10);
      if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
      return d;
    }
    case "UPI":
    case "EMAIL":
      return v.toLowerCase();
    case "BANK":
      return v.replace(/\s|-/g, "");
    case "WEBSITE": {
      v = v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
      return v.replace(/\/+$/, "");
    }
    case "SOCIAL":
      return v.toLowerCase().replace(/^@/, "");
    case "CRYPTO":
      return v.startsWith("0x") ? v.toLowerCase() : v;
    default:
      return v;
  }
}

export function hashValue(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

const DOT = "•";

/**
 * Public masking policy: only UPI IDs and bank account numbers are masked (last 4 kept).
 * Phone numbers, holder names, bank names, wallets, sites, emails and handles are shown in full.
 */
export function mask(type: string, v: string): string {
  if (!v) return "";
  switch (type) {
    case "BANK":
      return "X".repeat(Math.max(v.length - 4, 4)) + v.slice(-4);
    case "UPI": {
      const [h, d] = v.split("@");
      const tail = h.slice(-4);
      return DOT.repeat(Math.max(h.length - tail.length, 3)) + tail + (d ? "@" + d : "");
    }
    default:
      return v;
  }
}

/** Does the public masking policy change this type at all? */
export const isMaskedType = (type: string) => type === "BANK" || type === "UPI";

/** All candidate (type, hash) pairs for a raw query, so search works without choosing a type. */
export function candidateHashes(raw: string): { type: string; hash: string }[] {
  const types = ["PHONE", "UPI", "BANK", "CRYPTO", "WEBSITE", "EMAIL", "SOCIAL", "APP"];
  const seen = new Set<string>();
  const out: { type: string; hash: string }[] = [];
  for (const t of types) {
    const n = normalize(t, raw);
    if (!n) continue;
    const key = t + ":" + n;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: t, hash: hashValue(n) });
  }
  return out;
}

export function displayValue(a: { type: string; value: string; visibility: string }): string | null {
  if (a.visibility === "HIDDEN") return null;
  if (a.visibility === "FULL") return a.value;
  return mask(a.type, a.value);
}

export function validate(type: string, normalized: string): string | null {
  if (!normalized) return "Identifier is required.";
  switch (type) {
    case "PHONE":
      if (!/^\d{10}$/.test(normalized)) return "Enter a valid 10-digit Indian mobile number.";
      break;
    case "UPI":
      if (!/^[\w.\-]{2,}@[a-z]{2,}$/.test(normalized)) return "Enter a valid UPI ID like name@okaxis.";
      break;
    case "BANK":
      if (!/^\d{9,18}$/.test(normalized)) return "Bank account numbers are 9 to 18 digits.";
      break;
    case "EMAIL":
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(normalized)) return "Enter a valid email.";
      break;
    case "WEBSITE":
      if (!/^[a-z0-9.-]+\.[a-z]{2,}/.test(normalized)) return "Enter a valid domain or URL.";
      break;
    case "CRYPTO":
      if (normalized.length < 20) return "Wallet address looks too short.";
      break;
  }
  return null;
}
