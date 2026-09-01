// Outbound email.
//
// Talks to Resend's REST API over plain fetch rather than pulling in an SDK:
// it is one POST with a JSON body, and a dependency for that is a dependency
// to keep patched forever.
//
// Configuration is entirely by environment, and the absence of it is a
// first-class state rather than a crash. With no RESEND_API_KEY the app runs
// exactly as before — messages are recorded QUEUED and nothing is sent — so
// a local checkout and a preview deploy need no secrets. Adding the key is
// what switches delivery on; no code change, no redeploy of logic.
//
// The deliberate non-goal here is retries. A failed send is recorded FAILED
// with its reason and left alone: an organizer needs to see that a message
// did not reach anyone far more than they need it silently retried, and a
// real retry needs a queue and idempotency keys rather than a loop.

export type MailResult =
  | { ok: true; sent: number }
  | { ok: false; reason: string; configured: boolean };

export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendBulkEmail(
  to: string[],
  subject: string,
  body: string
): Promise<MailResult> {
  if (!mailerConfigured()) {
    return {
      ok: false,
      configured: false,
      reason: "No mail provider configured (set RESEND_API_KEY and MAIL_FROM).",
    };
  }
  const recipients = Array.from(new Set(to.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  if (recipients.length === 0) {
    return { ok: false, configured: true, reason: "No recipients matched that audience." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        // BCC, not `to`: this is a bulk notice to competing clubs, and
        // putting them all in `to` would publish every manager's address to
        // every other manager.
        to: process.env.MAIL_FROM,
        bcc: recipients,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        configured: true,
        reason: `Provider rejected the send (${res.status}). ${detail.slice(0, 200)}`.trim(),
      };
    }
    return { ok: true, sent: recipients.length };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      reason: err instanceof Error ? err.message : "Network error contacting the mail provider.",
    };
  }
}
