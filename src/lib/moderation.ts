/**
 * Community posting rules: text and images only.
 * Blocked: links, app files, phone numbers, email addresses, account / UPI / card / ID numbers.
 * Those belong on the Report page (private, goes to the evidence vault), not in public chat.
 */

const LINK_RE =
  /(https?:\/\/|ftp:\/\/|www\.|\b[a-z0-9-]+\.(?:com|in|net|org|xyz|app|io|co|me|ly|site|online|shop|info|biz|club|top|link|tk|cc|vip|pro|live|store|cloud|page|dev|ai|us|uk)\b|\bt\.me\b|\bwa\.me\b|\bbit\.ly\b|\btinyurl\b|\.apk\b|\.exe\b|play\.google|apps\.apple|chat\.whatsapp|telegram\.me|\binstagram\.com\b)/i;
const OBFUSCATED_LINK_RE = /\b[a-z0-9-]+\s*(?:\[\s*(?:dot|\.)\s*\]|\(\s*dot\s*\)|\s+dot\s+)\s*[a-z]{2,}\b/i;
const EMAIL_RE = /[\w.+-]+\s*(?:@|\[at\]|\(at\))\s*[\w-]+\s*(?:\.|\[dot\]|\(dot\))\s*[a-z]{2,}/i;
const UPI_RE = /\b[\w.-]{2,}@(?:ok[a-z]+|ybl|ibl|axl|paytm|upi|apl|oksbi|okaxis|okhdfcbank|okicici|fam|yapl|ptyes|ptaxis|pthdfc|ptsbi|waaxis|wahdfcbank|waicici|wasbi|jupiteraxis|axisb|sbi|hdfcbank|icici|kotak|idfcbank|federal|indus|rbl|yesbank|barodampay|cnrb|pnb|boi|uboi|unionbank|citi|hsbc|sc|dbs|airtel|freecharge|jio|naviaxis|slice|superyes|timecosmos|tapicici|kmbl|axisbank|dlb|cmsidfc|idbi|iob|mahb|psb|tjsb|utbi|vijb|yesg)\b/i;
const PHONE_RE = /(?:\+?91[\s-]*)?(?:[6-9][\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d)\b/;
const LONG_NUMBER_RE = /\b\d(?:[\s-]*\d){8,}\b/; // 9+ digits: account numbers, cards, Aadhaar
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/;
const IFSC_RE = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;

type Rule = { re: RegExp; label: string };
const RULES: Rule[] = [
  { re: LINK_RE, label: "a link or app file" },
  { re: OBFUSCATED_LINK_RE, label: "a disguised link" },
  { re: EMAIL_RE, label: "an email address" },
  { re: UPI_RE, label: "a UPI ID" },
  { re: PHONE_RE, label: "a phone number" },
  { re: LONG_NUMBER_RE, label: "an account, card or ID number" },
  { re: PAN_RE, label: "a PAN number" },
  { re: IFSC_RE, label: "an IFSC code" },
];

export function findViolation(text: string): { label: string; match: string } | null {
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) return { label: r.label, match: m[0] };
  }
  return null;
}

export function validateCommunityText(text: string, { min = 2, max = 3000 } = {}): string | null {
  const t = text.trim();
  if (t.length < min) return "Write something first.";
  if (t.length > max) return `Keep it under ${max} characters.`;
  const v = findViolation(t);
  if (v) return `Not allowed in the community: ${v.label} ("${v.match.trim()}"). Describe it in words and attach a screenshot. To hand numbers or accounts to moderators, use the Report page.`;
  return null;
}

export const POST_VERDICTS = [
  { key: "SCAM", label: "Scam / fraud", cls: "badge-red" },
  { key: "SUSPICIOUS", label: "Looks suspicious", cls: "badge-amber" },
  { key: "SAFE", label: "Looks genuine", cls: "badge-green" },
  { key: "NOT_SURE", label: "Not sure", cls: "badge-gray" },
] as const;

export const postVerdict = (k: string | null) => POST_VERDICTS.find((v) => v.key === k) ?? null;

export const FLAG_REASONS = [
  { key: "BOT", label: "Bot or fake account" },
  { key: "SCAMMER", label: "This user is trying to cheat people" },
  { key: "PROMO", label: "Advertising or luring to another platform" },
  { key: "PERSONAL", label: "Shares someone's private details" },
  { key: "ABUSE", label: "Abusive or harassing" },
  { key: "OTHER", label: "Something else" },
] as const;
