"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { candidateHashes, normalize, hashValue } from "@/lib/identifiers";
import { ACCOUNT_TYPES } from "@/lib/scamTypes";
import { ADVICE_CATEGORIES } from "@/lib/adviceCategories";
import { saveEvidence } from "@/lib/uploads";
import { requestMeta } from "@/lib/request";
import { formValues, type Values } from "@/lib/formValues";
import { getSettings } from "@/lib/settings";

export type AdviceState = { error?: string; values?: Values; n?: number };

const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();

export async function submitAdvice(prev: AdviceState, fd: FormData): Promise<AdviceState> {
  const fail = (error: string): AdviceState => ({ error, values: formValues(fd), n: (prev.n ?? 0) + 1 });
  if (str(fd, "website_url_hp")) return {};
  if (!(await getSettings()).adviceOpen) return fail("Guidance requests are paused by the admin right now.");
  const category = str(fd, "category");
  const subject = str(fd, "subject") || null;
  const identifierType = str(fd, "identifierType") || "OTHER";
  const raw = str(fd, "identifier");
  const websiteUrl = str(fd, "websiteUrl") || null;
  const description = str(fd, "description");

  if (!ADVICE_CATEGORIES.some((c) => c.key === category)) return fail("Choose what you are asking about.");
  if (description.length < 20) return fail("Tell us a bit more (at least 20 characters).");
  if (!subject && !raw && !websiteUrl) return fail("Give us at least a name, a link, or an account/number so we know what to check.");

  // Identifier is optional. When present, normalize it and auto-match against exposed accounts.
  let identifier = "";
  let identifierHash = "";
  let matchedAccountId: string | null = null;
  if (raw) {
    const t = ACCOUNT_TYPES.some((x) => x.key === identifierType) ? identifierType : "OTHER";
    identifier = normalize(t === "OTHER" ? "APP" : t, raw);
    identifierHash = hashValue(identifier);
    const match = await prisma.account.findFirst({
      where: { status: "APPROVED", OR: candidateHashes(raw).map((c) => ({ type: c.type, valueHash: c.hash })) },
    });
    matchedAccountId = match?.id ?? null;
  }
  // Also try to match the website/app link and the subject name against exposed sites and apps.
  if (!matchedAccountId) {
    const extra = [websiteUrl, subject].filter((x): x is string => !!x);
    for (const q of extra) {
      const m = await prisma.account.findFirst({
        where: { status: "APPROVED", OR: candidateHashes(q).map((c) => ({ type: c.type, valueHash: c.hash })) },
      });
      if (m) {
        matchedAccountId = m.id;
        break;
      }
    }
  }

  const { ipHash, userAgent } = await requestMeta();
  const token = randomBytes(12).toString("hex");
  const created = await prisma.adviceRequest.create({
    data: {
      token,
      category,
      subject,
      identifierType,
      identifier,
      identifierHash,
      holderName: str(fd, "holderName") || null,
      bankName: str(fd, "bankName") || null,
      platform: str(fd, "platform") || null,
      websiteUrl,
      amountInr: Math.max(0, parseInt(str(fd, "amountInr") || "0", 10) || 0),
      description,
      contactName: str(fd, "contactName") || null,
      contactEmail: str(fd, "contactEmail") || null,
      contactPhone: str(fd, "contactPhone") || null,
      matchedAccountId,
      ipHash,
      userAgent,
    },
  });
  await saveEvidence(fd, "screenshots", { adviceId: created.id });
  redirect(`/advice/${token}`);
}
