import { prisma } from "./prisma";
import { TEXT_DEFAULTS, TEXT_FIELDS, type SiteText } from "./siteText";

/** Admin-controlled switches and copy. Stored as key/value rows so they change without a deploy. */
export type Switches = {
  communityOpen: boolean; // master switch: false = feed read-only
  communityPosts: boolean;
  communityReplies: boolean;
  communityReactions: boolean;
  communityMessage: string; // shown when paused
  reportsOpen: boolean;
  adviceOpen: boolean;
  commentsOpen: boolean;
  announcement: string; // site-wide banner, empty = hidden
};
export type Settings = Switches & SiteText;

export const DEFAULTS: Settings = {
  communityOpen: true,
  communityPosts: true,
  communityReplies: true,
  communityReactions: true,
  communityMessage: "The community is paused by the admin for a short while. You can still search accounts and file reports.",
  reportsOpen: true,
  adviceOpen: true,
  commentsOpen: true,
  announcement: "",
  ...TEXT_DEFAULTS,
};

const BOOL_KEYS = new Set<string>(["communityOpen", "communityPosts", "communityReplies", "communityReactions", "reportsOpen", "adviceOpen", "commentsOpen"]);
const TEXT_KEYS = new Set<string>(TEXT_FIELDS.map((f) => f.key));

export async function getSettings(): Promise<Settings> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.setting.findMany();
  } catch {
    // No database yet (first boot, or build time inside Docker): fall back to defaults.
    return { ...DEFAULTS };
  }
  const s: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) {
    if (!(r.key in DEFAULTS)) continue;
    if (BOOL_KEYS.has(r.key)) s[r.key] = r.value === "1";
    else if (TEXT_KEYS.has(r.key)) s[r.key] = r.value.trim() === "" ? TEXT_DEFAULTS[r.key as keyof SiteText] : r.value;
    else s[r.key] = r.value;
  }
  return s as Settings;
}

export async function saveSettings(next: Partial<Settings>) {
  const ops = Object.entries(next).map(([key, v]) =>
    prisma.setting.upsert({
      where: { key },
      create: { key, value: typeof v === "boolean" ? (v ? "1" : "0") : String(v ?? "") },
      update: { value: typeof v === "boolean" ? (v ? "1" : "0") : String(v ?? "") },
    }),
  );
  await prisma.$transaction(ops);
}

export const canPost = (s: Settings) => s.communityOpen && s.communityPosts;
export const canReply = (s: Settings) => s.communityOpen && s.communityReplies;
export const canReact = (s: Settings) => s.communityOpen && s.communityReactions;
