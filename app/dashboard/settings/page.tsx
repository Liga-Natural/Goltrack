import { SiteSettings } from "@/lib/models";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { saveBusinessIdentity } from "@/lib/actions";

export default async function SettingsPage() {
  const currentColor = await SiteSettings.getAccentColor();
  const currentTheme = await SiteSettings.getTheme();
  const business = await SiteSettings.getBusiness();

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-inkDisplay mb-1">Branding</h1>
      <p className="text-ink2 text-sm font-medium mb-6">
        Pick the accent color used across the whole site — black and white stay fixed as the foundation; this
        controls the red.
      </p>

      <div className="card p-6 max-w-2xl">
        <AccentColorPicker currentColor={currentColor} />
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-1">Theme</h2>
      <p className="text-ink2 text-sm font-medium mb-6">
        Choose which color leads the site — black main is the current look; white main inverts it using the same
        ink/paper/red identity.
      </p>

      <div className="card p-6 max-w-2xl">
        <ThemeToggle currentTheme={currentTheme} />
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-1">Business details</h2>
      <p className="text-ink2 text-sm font-medium mb-6">
        Printed at the top of every invoice. An invoice is an accounting record, so anything left blank is shown as
        “not set” on the paper copy rather than filled in with something plausible.
      </p>

      <form action={saveBusinessIdentity} className="card p-6 max-w-2xl space-y-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
            Registered business name
          </span>
          <input
            name="businessName"
            className="input w-full"
            defaultValue={business.businessName ?? ""}
            placeholder="Jogo Tournaments LLC"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
            Business address
          </span>
          <textarea
            name="businessAddress"
            rows={3}
            className="input w-full min-h-[90px] h-auto py-3"
            defaultValue={business.businessAddress ?? ""}
            placeholder={"Street\nCity, State ZIP"}
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold block mb-1.5">
            Tax ID
          </span>
          <input name="taxId" className="input w-full" defaultValue={business.taxId ?? ""} placeholder="EIN or VAT number" />
        </label>
        <button type="submit" className="btn-primary text-sm">
          Save business details
        </button>
      </form>
    </div>
  );
}
