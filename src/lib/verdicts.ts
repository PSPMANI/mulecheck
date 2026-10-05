export const VERDICTS: Record<string, { label: string; cls: string; headline: string }> = {
  SCAM: { label: "Scam / fraud", cls: "badge-red", headline: "Do not deposit or invest. This is a scam." },
  SUSPICIOUS: { label: "Suspicious", cls: "badge-amber", headline: "Hold your money. This has strong scam signals." },
  SAFE: { label: "No red flags found", cls: "badge-green", headline: "We found no red flags, but stay careful." },
  NEED_INFO: { label: "Need more info", cls: "badge-blue", headline: "We need more details to advise you." },
};
