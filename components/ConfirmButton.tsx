"use client";

import { useRef, useState } from "react";

/**
 * A submit button that asks first.
 *
 * Only for the actions where a mis-tap costs something a person then has to
 * undo by hand or cannot undo at all: deleting a sponsor, rejecting a
 * photograph, publishing something to the public, clearing a child's age
 * document. Ordinary saves do not get one — a confirmation on every button
 * trains people to dismiss confirmations, which is how the one that mattered
 * gets clicked through.
 *
 * It is a real dialog rather than window.confirm: the browser's own box is
 * small, unstyled, and on a phone appears at the top of the screen far from
 * the thumb that triggered it.
 */
export function ConfirmButton({
  children,
  className = "btn-ghost text-xs",
  title,
  detail,
  confirmLabel,
  tone = "danger",
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  detail: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>

      {/* The real submit, kept out of the layout but inside the form, so the
          dialog's button can trigger the server action the form already
          carries rather than duplicating it. */}
      <button ref={submitRef} type="submit" className="sr-only" tabIndex={-1} aria-hidden />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)]"
            onClick={() => setOpen(false)}
          />
          <div className="modal-panel relative w-full max-w-md p-6 sm:p-7">
            <h2 className="text-xl font-extrabold text-inkDisplay mb-2">{title}</h2>
            <p className="text-sm text-ink2 mb-6">{detail}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                className={tone === "danger" ? "btn-primary text-sm" : "btn-primary text-sm"}
                onClick={() => {
                  setOpen(false);
                  submitRef.current?.click();
                }}
              >
                {confirmLabel}
              </button>
              <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>
                Keep it as it is
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
