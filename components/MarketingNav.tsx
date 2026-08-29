"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { RoleNav } from "./RoleNav";
import { IconMenu, IconX } from "./icons";

interface NavLink {
  href: string;
  label: string;
}

// One shared header for every marketing page (/, /tour, /inquire), instead
// of each page hand-rolling its own nav with a different mix of `hidden
// sm:inline-flex` links. That per-page approach broke because it had no
// middle ground: below 640px only 2 links showed and fit fine, but at 640px
// every link appeared at once — Logo plus up to 5 pill buttons — with
// nowhere near enough room in the header, so button text wrapped to two
// lines. This collapses to a single hamburger below `lg` (1024px, verified
// to comfortably fit the widest link set above it) instead of a half state
// that only works for the narrowest phones.
export function MarketingNav({
  links,
  ctaHref = "/signup",
  ctaLabel = "Get started",
  maxWidthClass = "max-w-6xl",
}: {
  links: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  maxWidthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    // Floating, not full-bleed: padding on the header itself (not the pill)
    // is what detaches the bar from the viewport edges — the pill inside
    // sits centered with breathing room on every side instead of gluing to
    // the top and stretching corner to corner like a conventional navbar.
    <header className="sticky top-3 sm:top-4 z-20 px-3 sm:px-4">
      <div className={`mx-auto ${maxWidthClass}`}>
        <div className="flex items-center justify-between gap-4 rounded-full border border-black/10 bg-surface/75 backdrop-blur-xl shadow-elevated px-3 sm:px-5 py-2 sm:py-2.5">
          <Link href="/" className="pl-1">
            <Logo />
          </Link>

          {/* xl-only (1280px+), not lg — this header is already tight at
              1024px with the widest link set (see the note above on why
              lg is the hamburger cutoff); a third pill cluster needs real
              room instead of squeezing in right at that same edge. */}
          <RoleNav />

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn-ghost">
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
            <Link href={ctaHref} className="btn-primary">
              {ctaLabel}
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href={ctaHref} className="btn-primary">
              {ctaLabel}
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full border border-black/15 text-black/70 hover:text-black hover:bg-black/5"
            >
              {open ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden mt-2 rounded-2xl border border-black/10 bg-surface/90 backdrop-blur-xl shadow-elevated px-3 py-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="block w-full rounded-lg px-3 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black">
                {l.label}
              </Link>
            ))}
            <Link href="/login" className="block w-full rounded-lg px-3 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black">
              Log in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
