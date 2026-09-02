"use client";

import { useEffect, useState } from "react";
import { Portal } from "./Portal";

// Copy + QR for a tournament's public registration link. The QR is generated
// in the browser on open rather than server-rendered with the page: the data
// URL is a few KB of base64 that would otherwise ship inside every dashboard
// overview payload, on a panel most visits never open.
export function ShareRegistrationLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [absolute, setAbsolute] = useState(path);

  // window is unavailable during SSR, so the absolute URL is resolved after
  // mount. Until then the relative path is shown, which is still correct,
  // just less useful to paste.
  useEffect(() => {
    setAbsolute(`${window.location.origin}${path}`);
  }, [path]);

  useEffect(() => {
    if (!showQr || qr) return;
    let cancelled = false;
    import("qrcode")
      .then((m) =>
        m.toDataURL(absolute, { margin: 1, width: 260, color: { dark: "#000000", light: "#ffffffff" } })
      )
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showQr, qr, absolute]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission can be denied; the link stays visible to copy by hand.
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <code className="block flex-1 min-w-0 truncate bg-black/[0.05] rounded-lg px-3 py-2 text-xs text-ink2">
          {absolute}
        </code>
        <button type="button" onClick={copy} className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button type="button" onClick={() => setShowQr(true)} className="btn-ghost text-xs px-2.5 py-1.5 shrink-0">
          QR
        </button>
      </div>

      {showQr && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close QR code"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setShowQr(false)}
          />
          <div className="relative modal-panel rounded-2xl p-6 w-full max-w-xs text-center">
            <h3 className="text-lg font-extrabold text-inkDisplay mb-1">Scan to register</h3>
            <p className="text-xs text-ink3 mb-5">Point a phone camera at this to open the entry form.</p>
            {/* White plate behind the code: a QR needs a light quiet zone to
                scan reliably, and on the black canvas the dark modules would
                otherwise sit on dark glass. */}
            <div className="rounded-xl bg-white p-3 inline-block">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code for the registration link" className="h-44 w-44 block" 
          loading="lazy"
          decoding="async"
        />
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-xs text-ink3">Generating…</div>
              )}
            </div>
            <button type="button" onClick={() => setShowQr(false)} className="btn-ghost text-xs w-full mt-5">
              Close
            </button>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
