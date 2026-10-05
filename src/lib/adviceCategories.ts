export const ADVICE_CATEGORIES = [
  { key: "PAYMENT_ACCOUNT", label: "A bank account / UPI / wallet I was asked to pay", needsIdentifier: true },
  { key: "EARNING_APP", label: "An earning / task / part-time app or site", needsIdentifier: false },
  { key: "INVESTMENT", label: "An investment, trading or crypto scheme", needsIdentifier: false },
  { key: "JOB_OFFER", label: "A job offer or work-from-home opportunity", needsIdentifier: false },
  { key: "LOAN", label: "A loan app or lender", needsIdentifier: false },
  { key: "WEBSITE", label: "A website, shop or link", needsIdentifier: false },
  { key: "PERSON", label: "A person, caller or social account contacting me", needsIdentifier: false },
  { key: "OTHER", label: "Something else", needsIdentifier: false },
] as const;

export const adviceCategoryLabel = (k: string) => ADVICE_CATEGORIES.find((c) => c.key === k)?.label ?? k;
