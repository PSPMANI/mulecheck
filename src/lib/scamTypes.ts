export const ACCOUNT_TYPES = [
  { key: "PHONE", label: "Phone number", hint: "+91 98765 43210" },
  { key: "UPI", label: "UPI ID", hint: "name@okaxis" },
  { key: "BANK", label: "Bank account", hint: "Account number" },
  { key: "CRYPTO", label: "Crypto wallet", hint: "0x... / bc1... / T..." },
  { key: "WEBSITE", label: "Website / URL", hint: "fake-site.xyz" },
  { key: "EMAIL", label: "Email", hint: "scammer@mail.com" },
  { key: "SOCIAL", label: "Social handle", hint: "@telegram_user" },
  { key: "APP", label: "Fake app", hint: "App name / package" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["key"];

export const SCAM_TYPES = [
  { key: "DIGITAL_ARREST", label: "Digital arrest", desc: "Fake police, CBI or ED video calls demanding money to clear your name." },
  { key: "INVESTMENT", label: "Investment / trading", desc: "Fake stock, forex or crypto trading groups and apps promising guaranteed returns." },
  { key: "TASK_JOB", label: "Task / part-time job", desc: "Like-and-earn, review tasks or data-entry jobs that require deposits." },
  { key: "LOAN_APP", label: "Loan app harassment", desc: "Instant loan apps with hidden charges, contact scraping and extortion." },
  { key: "UPI_FRAUD", label: "UPI / payment fraud", desc: "Collect requests, fake refund links, QR code and wrong-transfer tricks." },
  { key: "OTP_KYC", label: "OTP / KYC update", desc: "Calls or SMS asking to share OTP or update KYC or PAN to avoid blocking." },
  { key: "PHISHING", label: "Phishing / fake website", desc: "Clones of banks, government portals, courier or electricity sites." },
  { key: "SEXTORTION", label: "Sextortion", desc: "Recorded video calls followed by blackmail demands." },
  { key: "ROMANCE", label: "Romance / matrimony", desc: "Long-con relationships ending in requests for money or customs fees." },
  { key: "OLX_MARKETPLACE", label: "Marketplace / OLX", desc: "Fake buyers or sellers, army-man scams, advance payment fraud." },
  { key: "COURIER_CUSTOMS", label: "Courier / customs", desc: "Parcel-with-drugs story that leads to a digital arrest." },
  { key: "LOTTERY_PRIZE", label: "Lottery / prize", desc: "KBC lottery, lucky draw, prize-release fees." },
  { key: "ELECTRICITY_BILL", label: "Utility bill", desc: "Power disconnection tonight unless you pay via link or install an app." },
  { key: "CRYPTO_SCAM", label: "Crypto scam", desc: "Rug pulls, fake exchanges, pig-butchering wallets, fake airdrops." },
  { key: "IMPERSONATION", label: "Impersonation", desc: "Fake boss, relative, bank officer or customer-care numbers." },
  { key: "WEBSITE", label: "Website scam", desc: "Fake or fraudulent website." },
  { key: "WHATSAPP", label: "WhatsApp scam", desc: "Scam run over WhatsApp calls or messages." },
  { key: "LINK", label: "Malicious link", desc: "A link that steals money or data when opened." },
  { key: "APPLICATION", label: "Fake application", desc: "Fraudulent mobile or desktop app." },
  { key: "SCAM", label: "Scam", desc: "General scam." },
  { key: "GAMING", label: "Gaming scam", desc: "Betting, gaming or prediction app fraud." },
  { key: "JOB", label: "Job / task scam", desc: "Fake jobs and paid tasks." },
  { key: "LOAN", label: "Loan app scam", desc: "Instant loan app fraud and harassment." },
  { key: "OTHER", label: "Other", desc: "Anything else." },
] as const;

export type ScamType = (typeof SCAM_TYPES)[number]["key"];

export const ROLES = [
  { key: "MULE", label: "Mule account", desc: "Account used to receive and move victim money." },
  { key: "SCAMMER", label: "Scammer contact", desc: "Number or handle used to contact victims." },
  { key: "PHISHING", label: "Phishing", desc: "Fake website or link." },
  { key: "FAKE_APP", label: "Fake app", desc: "Malicious or fraudulent app." },
] as const;

export const scamLabel = (k: string) => SCAM_TYPES.find((s) => s.key === k)?.label ?? k;
export const typeLabel = (k: string) => ACCOUNT_TYPES.find((s) => s.key === k)?.label ?? k;
export const roleLabel = (k: string) => ROLES.find((s) => s.key === k)?.label ?? k;
