import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { PanicNotice } from "@/components/PanicNotice";
import { getSettings } from "@/lib/settings";
import { SiteNav } from "@/components/SiteNav";
import { NAV } from "@/lib/nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3018"),
  };
}

/** Render "cybercrime.gov.in" and "1930" in helpline text as a link and highlighted number. */
function Helpline({ text }: { text: string }) {
  const parts = text.split(/(cybercrime\.gov\.in|1930)/g);
  return (
    <>
      {parts.map((p, i) =>
        p === "cybercrime.gov.in" ? (
          <a key={i} className="underline font-medium text-fg" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
            {p}
          </a>
        ) : p === "1930" ? (
          <span key={i} className="mono font-semibold text-fg">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Logo({ name }: { name: string }) {
  const m = name.match(/^(.*?)([A-Z][a-z]+)$/);
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-white shadow-sm" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6L12 3z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <span className="text-[19px] font-extrabold tracking-tight leading-none">
        {m && m[1] ? (
          <>
            {m[1]}
            <span className="text-danger">{m[2]}</span>
          </>
        ) : (
          name
        )}
      </span>
    </span>
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  const dot = s.noMoneyNotice.indexOf(".");
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur relative">
          <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="shrink-0" aria-label={s.siteName}>
              <Logo name={s.siteName} />
            </Link>
            <SiteNav />
          </div>
        </header>

        <PanicNotice compact short={s.panicShort} />
        {s.announcement && (
          <div className="border-b notice-red text-center text-sm px-4 py-2.5">
            <strong className="text-danger">Announcement:</strong> <span className="text-fg">{s.announcement}</span>
          </div>
        )}

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 md:py-10">{children}</main>

        <footer className="border-t border-line bg-white mt-16">
          <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
            <div className="space-y-3">
              <Logo name={s.siteName} />
              <p className="text-muted">{s.metaDescription}</p>
              <div className="rounded-xl border notice-green p-3 text-[13px] text-fg">
                {dot > 0 ? (
                  <>
                    <strong>{s.noMoneyNotice.slice(0, dot + 1)}</strong>
                    {s.noMoneyNotice.slice(dot + 1)}
                  </>
                ) : (
                  <strong>{s.noMoneyNotice}</strong>
                )}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-3">Navigate</div>
              <ul className="space-y-2">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="text-fg hover:underline">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/report" className="text-danger font-semibold hover:underline">
                    Report a scam
                  </Link>
                </li>
                <li>
                  <Link href="/api/exposure" className="text-muted hover:underline">
                    Public JSON feed
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-muted hover:underline">
                    Moderator login
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <div>
                <div className="eyebrow mb-2">Lost money?</div>
                <p className="text-muted">
                  <Helpline text={s.helplineNote} />
                </p>
              </div>
              {s.contactEmail && (
                <div>
                  <div className="eyebrow mb-2">Disputes and takedowns</div>
                  <a className="underline font-medium text-fg" href={`mailto:${s.contactEmail}`}>
                    {s.contactEmail}
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-line">
            <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted leading-relaxed">
              <strong className="text-fg">Disclaimer.</strong> {s.disclaimer}
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
