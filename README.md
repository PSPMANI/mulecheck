# MuleCheck: Daily Mule & Scam Account Exposure

Public board that exposes mule bank accounts, scam UPI IDs, fraud phone numbers, phishing sites, fake apps and crypto wallets, published daily after moderator review.

## Features

- **Daily exposure board** (`/`): today's verified identifiers, stat tiles, 14-day trend, top scam patterns.
- **Check a number** (`/search`): exact-match lookup. A visitor who already holds the identifier gets a match even when the public list masks it.
- **Report** (`/report`): victims submit identifiers with evidence; reports go to a moderation queue. Includes a "dispute a listing" option for wrongly listed account holders.
- **Ask before you pay** (`/advice`): a user sends the account, platform and offer; a moderator replies with a verdict (Scam / Suspicious / No red flags / Need info) on a private link. Auto-matches against exposed accounts and warns instantly.
- **Evidence vault**: reports and guidance requests accept up to 8 screenshots/PDFs each. Files are stored under `data/uploads/` (never public), hashed with SHA-256, and served only to logged-in moderators at `/admin/evidence/<id>`.
- **Police export**: every account has a printable case file (`/admin/case/<id>`, use Print to save as PDF) and a JSON dossier download (`/admin/export/<id>`) with all reports, incident date/time, transaction refs, website links, reporter contacts, device metadata, evidence hashes, guidance requests and comments.
- **Community feed** (`/community`): one open X-style feed. Anyone posts (text + screenshots), anyone replies under the same post, replies carry a Scam / Suspicious / Genuine / Not sure verdict that is tallied per post, and every post has one-tap emoji reactions for people who cannot type a reply. Links, app files, phone numbers, emails and account numbers are blocked. Users flag bots or cheaters with “Report to admin”; admin replies in-thread with an Admin badge and shows as online. No private messaging by design: everything stays public and moderated.
- **Comments and reactions**: visitors can comment under each exposed account (emoji picker included, emojis are highlighted) and react with emoji. Moderators can hide comments from the Comments tab.
- **Site text** (Admin, Site text tab): every notice, disclaimer, headline, intro and the site name are editable without touching code. Empty field = default wording.
- **Moderator accounts** (Admin, Users tab, owner only): user ID + password logins, Owner / Moderator roles, generated temporary passwords, forced change at first login, disable, reset, delete. Audit log records who did what.
- **Admin settings** (Admin, Settings tab): pause the whole community or just posts, replies or reactions; switch comments, reports and guidance requests on or off; set the paused message and a site-wide announcement. Changes apply instantly and are audit-logged.
- **Scam playbooks** (`/scams`).
- **Moderation** (`/admin`): review queue, approve/reject, per-record **visibility** (Show full / Masked / Hidden), status, edit, delete, "expose today", add verified account, CSV import.
- **Public JSON API**: `GET /api/exposure?date=YYYY-MM-DD` (or `?all=1`), `GET /api/check?type=PHONE&q=98...`.

## Run locally

```bash
npm install
npx prisma db push
npm run import -- path/to/your-list.csv
npm run dev
```

Open http://localhost:3018. Moderator login at `/admin/login`. On first run the owner account is created from `ADMIN_USER` and `ADMIN_PASSWORD` in `.env`, and you are asked to change the password. After that, add moderators in Admin > Users; `.env` is no longer used for login.

## Visibility rules

Public lists always show holder name, bank name, platform, phone numbers, wallets, sites, emails and handles in full. Only UPI IDs and bank account numbers are reduced to their last 4 characters when `visibility` is `MASKED` (the default). `FULL` shows them whole, `HIDDEN` removes the record from public lists and the API. An exact search for any identifier (bank account, UPI, mobile, WhatsApp, Telegram handle, wallet, email, site) always returns the complete record, including hidden ones. The moderator sets visibility per record.

## CSV format

```
type,value,scamType,role,summary,bankName,holderName,platform,amountInr,visibility,exposedOn,tags,reportCount
```

`type` is one of PHONE UPI BANK CRYPTO WEBSITE EMAIL SOCIAL APP. `role` is one of MULE SCAMMER PHISHING FAKE_APP. Scam types are listed in `src/lib/scamTypes.ts`.

CLI import:

```bash
npm run import -- path/to/file.csv --visibility=MASKED
```

Add `--pending` to load rows into the review queue instead of publishing.

## Evidence storage in production

`data/uploads/` is local disk. On Vercel the filesystem is ephemeral, so point `saveEvidence` in `src/lib/uploads.ts` at object storage (S3, Cloudflare R2 or Vercel Blob) before deploying there, or deploy to a VPS/Railway/Render with a persistent volume mounted at `data/uploads`.

## Deploy

See [DEPLOY.md](DEPLOY.md) for the step-by-step VPS + Docker + HTTPS setup (recommended) and Railway/Render alternatives.

## Deploy (Vercel + Postgres, advanced)

1. In `prisma/schema.prisma` change `provider = "sqlite"` to `"postgresql"`.
2. Set `DATABASE_URL` (Neon/Supabase/Vercel Postgres), `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` in Vercel.
3. Run `npx prisma db push` against the production DB once, then deploy.

## Legal note

Listings are allegations from victim reports, not findings of guilt. Keep MASKED as the default, approve only with evidence, and act on disputes quickly. Direct victims to 1930 / cybercrime.gov.in.

## Wipe everything

```bash
npm run wipe
```

Deletes all accounts, reports, evidence files, advice requests, community posts, comments and flags. Keeps the audit log.
