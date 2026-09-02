import Link from "next/link";
import { Inquiries, Applications, ApplicationMessages } from "@/lib/models";
import { TabPanel } from "@/components/TabPanel";
import { tierClass } from "@/lib/tierStyles";
import { mailerConfigured } from "@/lib/mailer";

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink2 py-10 text-center">{children}</p>;
}

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const [inquiries, applications, messages] = await Promise.all([
    Inquiries.listAll(),
    Applications.listAllRecent(),
    ApplicationMessages.listAllRecent(),
  ]);

  const pending = applications.filter((a) => a.status === "PENDING").length;
  const undelivered = messages.filter((m) => m.status !== "SENT").length;

  const tabs = [
    {
      key: "inquiries",
      label: "Enquiries",
      count: inquiries.length,
      panel:
        inquiries.length === 0 ? (
          <Empty>Nothing from the contact form yet.</Empty>
        ) : (
          <div className="divide-y divide-lineSoft">
            {inquiries.map((q) => (
              <div key={q.id} className="py-4">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{q.name}</p>
                    {/* mailto, not plain text: an admin reading this wants to
                        reply, and the address is the only action on the row. */}
                    <a href={`mailto:${q.email}`} className="text-xs text-ink2 hover:text-black truncate block">
                      {q.email}
                      {q.phone ? ` · ${q.phone}` : ""}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {q.tournamentType && <span className="badge text-[10px]">{q.tournamentType}</span>}
                    <span className="text-[11px] text-ink3">{when(q.createdAt)}</span>
                  </div>
                </div>
                {/* whitespace-pre-wrap: these are typed by a human into a
                    textarea, so their line breaks are meaning, not noise. */}
                <p className="text-sm text-ink2 whitespace-pre-wrap">{q.message}</p>
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "applications",
      label: "Applications",
      count: applications.length,
      panel:
        applications.length === 0 ? (
          <Empty>No team applications across any tournament yet.</Empty>
        ) : (
          <div className="divide-y divide-lineSoft">
            {applications.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/tournaments/${a.tournamentId}/applications`}
                className="flex items-center gap-3 py-3.5 -mx-2 px-2 rounded-lg hover:bg-black/[0.03] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {a.teamName}
                    {a.division && (
                      <span className={`badge text-[10px] ml-2 align-middle ${tierClass(a.division)}`}>
                        {a.division}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink3 truncate">
                    {[a.tournamentName, a.managerName, `${a.rosterCount} players`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`badge text-[10px] shrink-0 ${
                    a.status === "ACCEPTED" ? "badge-accepted" : a.status === "PENDING" ? "badge-pending" : ""
                  }`}
                >
                  {a.status}
                </span>
                <span className="text-[11px] text-ink3 shrink-0 hidden sm:inline">{when(a.createdAt)}</span>
              </Link>
            ))}
          </div>
        ),
    },
    {
      key: "messages",
      label: "Sent messages",
      count: messages.length,
      panel:
        messages.length === 0 ? (
          <Empty>No messages have been composed yet.</Empty>
        ) : (
          <div className="divide-y divide-lineSoft">
            {messages.map((m) => (
              <div key={m.id} className="py-3.5 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{m.subject}</p>
                  <p className="text-xs text-ink3 truncate">
                    {[m.tournamentName, m.audience, `${m.recipientCount} recipient${m.recipientCount === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`badge text-[10px] shrink-0 ${
                    m.status === "SENT" ? "badge-accepted" : m.status === "FAILED" ? "badge-danger" : "badge-pending"
                  }`}
                >
                  {m.status}
                </span>
                <span className="text-[11px] text-ink3 shrink-0 hidden sm:inline">{when(m.createdAt)}</span>
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Inbox</h1>
        <p className="text-ink2 text-sm font-medium">
          Everything coming in across the platform — contact enquiries, team applications, and outbound messages.
        </p>
      </div>

      {!mailerConfigured() && (
        <div className="card badge-pending rounded-2xl p-4 text-sm">
          No mail provider is configured, so outbound messages are recorded but never delivered. Set{" "}
          <code className="text-xs">RESEND_API_KEY</code> and <code className="text-xs">MAIL_FROM</code> to switch
          sending on.
        </div>
      )}

      <div className="card mesh p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            ["Enquiries", inquiries.length],
            ["Applications", applications.length],
            ["Awaiting review", pending],
            ["Undelivered", undelivered],
          ].map(([label, value]) => (
            <div key={label as string} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-ink2 font-semibold mb-1 truncate">{label}</p>
              <p className="font-score text-2xl text-inkDisplay leading-none">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <TabPanel tabs={tabs} />
      </div>
    </div>
  );
}
