"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Mounted once in the root layout — not one client component per animated
// element. It just arms a global attribute (so CSS can hide .reveal
// elements only once JS is confirmed running) and watches every .reveal
// node in the DOM with a single shared IntersectionObserver, regardless of
// which server-rendered page it came from. Elements are visible by default
// (see globals.css) so anything server-rendered still shows up with no JS
// or before hydration — this only ever adds a reveal effect, never hides
// content permanently.
//
// Re-runs on every pathname change: the App Router swaps in a whole new
// server-rendered tree on client-side navigation without remounting this
// component, so a one-time query on mount would miss every .reveal node on
// any page after the first.
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    document.documentElement.setAttribute("data-reveal-armed", "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    const targets = document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)");
    for (const el of targets) {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.transitionDelay = `${delay}ms`;
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
