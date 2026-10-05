/** Report form vocabulary, as specified by the site owner. */

export const SCAM_CATEGORIES = [
  { key: "WEBSITE", label: "Website" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "LINK", label: "Link" },
  { key: "APPLICATION", label: "Application" },
  { key: "SCAM", label: "Scam" },
  { key: "GAMING", label: "Gaming" },
  { key: "INVESTMENT", label: "Investment / trading" },
  { key: "JOB", label: "Job / task" },
  { key: "LOAN", label: "Loan app" },
  { key: "OTHER", label: "Other" },
] as const;

export const scamCategoryLabel = (k: string) => SCAM_CATEGORIES.find((c) => c.key === k)?.label ?? k;

/** Identifier groups in the form. Each maps to an Account type on the board. */
export const PAYMENT_TYPES = [
  { key: "UPI", label: "UPI ID" },
  { key: "BANK", label: "Bank account number" },
] as const;

export const LINK_TYPES = [
  { key: "WEBSITE", label: "Website link" },
  { key: "APP", label: "Application link / name" },
] as const;

export const CONTACT_TYPES = [
  { key: "SOCIAL", label: "Telegram username" },
  { key: "PHONE", label: "WhatsApp number" },
  { key: "PHONE_MOBILE", label: "Mobile number" },
] as const;

/** Map a form identifier kind to the Account.type stored on the board. */
export function toAccountType(kind: string): string {
  switch (kind) {
    case "PHONE_MOBILE":
      return "PHONE";
    case "GROUP":
      return "WEBSITE";
    default:
      return kind;
  }
}

export type IdentifierRow = { kind: string; value: string };
