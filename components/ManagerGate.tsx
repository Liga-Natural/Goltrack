"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { managerGate } from "@/lib/actions";
import { Portal } from "./Portal";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full text-sm py-2.5" disabled={pending}>
      {pending ? "Checking…" : "Continue to registration"}
    </button>
  );
}

// Gate in front of team registration. One form covers both new and returning
// managers because the action behind it creates-or-signs-in on the same
// credentials — a coach with an existing account types the same password
// they always do and lands in the right place, with no "already have an
// account?" branch to choose wrongly.
export function ManagerGate({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(managerGate.bind(null, slug), {});

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary text-base px-6 py-3">
        Register team →
      </button>

      {open && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative modal-panel rounded-2xl w-full sm:max-w-md max-h-full overflow-y-auto p-6">
            <h3 className="text-xl font-extrabold text-inkDisplay mb-1">Create a manager account</h3>
            <p className="text-xs text-ink3 mb-5">
              Or log in — same form either way. Your application is linked to this account, and the roster portal
              opens here once your team is accepted.
            </p>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="label" htmlFor="gate-name">Full name</label>
                <input id="gate-name" className="input" name="name" required placeholder="Jordan Reyes" />
              </div>
              <div>
                <label className="label" htmlFor="gate-email">Email</label>
                <input id="gate-email" className="input" type="email" name="email" required placeholder="coach@club.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="label" htmlFor="gate-password">Password</label>
                  <input id="gate-password" className="input" type="password" name="password" required minLength={8} placeholder="8+ characters" />
                </div>
                <div className="min-w-0">
                  <label className="label" htmlFor="gate-phone">Phone</label>
                  <input id="gate-phone" className="input" name="phone" placeholder="(305) 555-0100" />
                </div>
              </div>

              {state.error && (
                <p className="badge badge-pending w-full justify-start text-xs py-2">{state.error}</p>
              )}

              <Submit />
            </form>

            {/* Rendered, but disabled and labelled as such. No OAuth client is
                configured for this project, so a live-looking Google button
                would do nothing when tapped — worse than showing honestly
                that the option isn't connected yet. */}
            <div className="mt-5 pt-5 border-t border-lineSoft">
              <p className="text-[11px] uppercase tracking-wide text-ink3 font-semibold mb-3 text-center">
                Not connected yet
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled className="btn-ghost text-xs justify-center" title="Google sign-in is not configured">
                  Google
                </button>
                <button type="button" disabled className="btn-ghost text-xs justify-center" title="Apple sign-in is not configured">
                  Apple
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs w-full mt-5">
              Cancel
            </button>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
