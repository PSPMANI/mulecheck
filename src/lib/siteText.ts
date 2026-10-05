/** Every editable piece of site copy, with its default. Edited from Admin > Site text. */
export const TEXT_FIELDS = [
  { key: "siteName", label: "Site name", rows: 1, def: "MuleCheck" },
  { key: "siteTagline", label: "Tagline (header badge)", rows: 1, def: "Scam account registry" },
  { key: "metaTitle", label: "Browser tab title", rows: 1, def: "MuleCheck: Daily Mule & Scam Account Exposure" },
  { key: "metaDescription", label: "Search engine description", rows: 2, def: "Daily public exposure of mule bank accounts, scam UPI IDs, fraud phone numbers, phishing sites and crypto wallets reported by victims and verified by moderators." },

  { key: "homeKicker", label: "Home: small label above headline", rows: 1, def: "Public exposure board" },
  { key: "homeHeadline", label: "Home: headline (use {day} for today/yesterday)", rows: 1, def: "Mule accounts & scam contacts exposed {day}" },
  { key: "homeSub", label: "Home: subtitle", rows: 2, def: "Bank accounts, UPI IDs, phone numbers, wallets and sites that victims reported and moderators verified. Published daily so you can check before you pay." },

  { key: "panicShort", label: "Top bar notice (every page)", rows: 2, def: "Do not panic and pay. Take your time. There is no reason to transfer money immediately. Scammers create urgency because speed is how you lose money." },
  { key: "panicTitle", label: "Home notice: title", rows: 1, def: "Do not panic and pay. Let it take some time." },
  { key: "panicBody", label: "Home notice: body", rows: 3, def: "Nobody genuine needs your money in the next ten minutes. Not the police, not customs, not a bank, not an employer, not a trading mentor. If someone is pushing you to transfer immediately, that pressure is the scam. Slow down, check the account here, ask a moderator, call 1930. If you do it speedily, you will lose money." },

  { key: "noMoneyNotice", label: "Footer: we never ask for money", rows: 3, def: "We never ask for money or information. MuleCheck does not charge fees, does not ask for OTPs, passwords, card or bank details, does not call you, and does not offer to recover lost money. Anyone contacting you in our name asking for money or details is a scammer. Report them here." },
  { key: "disclaimer", label: "Footer: disclaimer", rows: 4, def: "Listings are based on victim reports reviewed by moderators. They are allegations, not findings of guilt. Mule accounts are often opened in the names of people who were tricked or paid to lend their account. If an identifier belonging to you is listed in error, write to the contact email in the footer and we will review it." },
  { key: "helplineNote", label: "Footer: helpline line", rows: 2, def: "Victims should also report at cybercrime.gov.in or call 1930 (India cyber fraud helpline) immediately to freeze funds." },
  { key: "contactEmail", label: "Contact email for disputes and takedowns (shown in footer)", rows: 1, def: "" },

  { key: "searchTitle", label: "Check page: title", rows: 1, def: "Verify before you pay" },
  { key: "searchSub", label: "Check page: subtitle", rows: 2, def: "Paste the exact bank account number, UPI ID, mobile or WhatsApp number, Telegram handle, wallet address, email or website. If it is in our records you will see the complete entry." },

  { key: "reportTitle", label: "Report page: title", rows: 1, def: "Report a scam or mule account" },
  { key: "reportSub", label: "Report page: subtitle", rows: 2, def: "Every report is reviewed by a moderator before it is published. Your contact details are never shown publicly." },
  { key: "reportUrgent", label: "Report page: urgent box", rows: 2, def: "Lost money in the last few hours? Call 1930 first and file at cybercrime.gov.in. Banks can freeze mule accounts fastest when the complaint is filed quickly. Then come back and report here." },

  { key: "adviceKicker", label: "Advice page: small label", rows: 1, def: "Get advice before you pay, join or invest" },
  { key: "adviceTitle", label: "Advice page: title", rows: 1, def: "Not sure about an app, a job, a scheme or an account? Ask us." },
  { key: "adviceSub", label: "Advice page: subtitle", rows: 3, def: "Earning apps, task jobs, trading groups, loan apps, online shops, matrimony contacts, customer-care numbers, anything. Send the details and screenshots. A moderator checks it against our records and known scam patterns and tells you whether to go ahead, hold, or walk away. Usually within a few hours." },

  { key: "communityTitle", label: "Community: title", rows: 1, def: "Talk to everyone. Scam or genuine?" },
  { key: "communitySub", label: "Community: subtitle", rows: 3, def: "One open feed for all users. Post what you got, reply under each other's posts, give your verdict, or just tap an emoji. Text and screenshots only, no links, numbers, emails or app files. Flag bots and cheaters with “Report to admin”." },
  { key: "communityComposePlaceholder", label: "Community: compose box placeholder", rows: 2, def: "What happened? Ask the community if it is a scam. Text and screenshots only, no links or numbers." },
  { key: "communityComposeNote", label: "Community: note under compose box", rows: 1, def: "Everything here is public. Never post OTPs, card numbers or passwords." },

  { key: "scamsTitle", label: "Scam types page: title", rows: 1, def: "Scam guide" },
  { key: "scamsSub", label: "Scam types page: subtitle", rows: 2, def: "The patterns behind the accounts we expose, and how to recognise them." },
] as const;

export type TextKey = (typeof TEXT_FIELDS)[number]["key"];
export type SiteText = Record<TextKey, string>;

export const TEXT_DEFAULTS: SiteText = Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.def])) as SiteText;
