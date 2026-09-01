"use client";

import { useState } from "react";
import { Portal } from "./Portal";

// Wraps the server-rendered paper invoice. The document itself arrives as
// `children` so it stays a server component — none of its markup or the
// invoice data ships to the browser as a client bundle.
//
// The same node is never rendered twice: whichever of the two places is
// showing it (inline for printing, or the preview sheet) is the only one that
// mounts. Two copies would both land in the print output.
export function InvoicePaper({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState(false);

  return (
    <>
      {/* The card chrome lives in here rather than around this component. It
          has to be a *sibling* of the paper copy, not its parent: an ancestor
          marked no-print is display:none in print, and a descendant cannot
          climb back out of that — which silently produced a blank page. */}
      <div className="card p-5 sm:p-6 no-print">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink2 mb-3">Official copy</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={() => setPreview(true)}>
            Preview print copy
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => window.print()}>
            Print invoice
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
        {/* Both buttons open the same dialog because that is genuinely how a
            browser makes a PDF of a page: the print dialog's "Save as PDF"
            destination. Naming a separate export that quietly did the same
            thing would be the dishonest option. */}
        <p className="text-[11px] text-ink3 mt-2">
          Export PDF opens your print dialog — choose “Save as PDF” as the destination.
        </p>
      </div>

      {/* Hidden on screen, printed on paper. See the @media print block in
          globals.css, which also strips the sidebar and the ambient glow. */}
      {!preview && <div className="invoice-paper">{children}</div>}

      {preview && (
        <Portal>
          <div className="fixed inset-0 z-50 overflow-y-auto invoice-preview">
            <button
              type="button"
              aria-label="Close preview"
              className="no-print fixed inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm"
              onClick={() => setPreview(false)}
            />
            <div className="relative min-h-full flex flex-col items-center py-8 px-4">
              <div className="no-print flex items-center gap-2 mb-4">
                <button type="button" className="btn-primary text-xs" onClick={() => window.print()}>
                  Print this
                </button>
                <button type="button" className="btn-ghost text-xs" onClick={() => setPreview(false)}>
                  Close
                </button>
              </div>
              {/* The sheet: a real white page on screen, so what is previewed
                  is the same markup that prints rather than an impression of
                  it. */}
              <div className="invoice-sheet w-full max-w-3xl bg-[#ffffff] rounded-sm shadow-2xl">{children}</div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
