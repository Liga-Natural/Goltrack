import { SiteSettings } from "@/lib/models";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function SettingsPage() {
  const currentColor = await SiteSettings.getAccentColor();
  const currentTheme = await SiteSettings.getTheme();

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
    </div>
  );
}
