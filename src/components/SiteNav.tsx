"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex items-center gap-1 text-[14px]">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              active(n.href) ? "bg-bg3 text-fg" : "text-muted hover:bg-bg3 hover:text-fg"
            }`}
          >
            {n.label}
          </Link>
        ))}
        <Link href="/report" className="btn btn-danger btn-sm ml-3 shrink-0">
          <ReportIcon />
          <span className="lg:hidden">Report</span>
          <span className="hidden lg:inline">Report a scam</span>
        </Link>
      </nav>

      {/* Mobile */}
      <div className="flex md:hidden items-center gap-2">
        <Link href="/report" className="btn btn-danger btn-sm">
          Report
        </Link>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="btn btn-sm px-2.5">
          {open ? (
            <span className="block w-5 text-center text-base leading-none">✕</span>
          ) : (
            <span className="block w-5">
              <span className="block h-0.5 bg-fg rounded" />
              <span className="block h-0.5 bg-fg rounded my-1" />
              <span className="block h-0.5 bg-fg rounded" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute left-0 right-0 top-16 border-b border-line bg-bg2 shadow-md">
          <nav className="mx-auto max-w-6xl px-4 py-3 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-3 text-base font-medium ${active(n.href) ? "bg-bg3 text-fg" : "text-muted hover:bg-bg3 hover:text-fg"}`}
              >
                {n.label}
              </Link>
            ))}
            <Link href="/report" className="btn btn-danger mt-2">
              Report a scam
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
