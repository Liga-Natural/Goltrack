import { SiteSettings } from "@/lib/models";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SettingsPage() {
  const currentColor = SiteSettings.getAccentColor();
  const currentTheme = SiteSettings.getTheme();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Branding</h1>
      <p className="text-black/50 text-sm mb-6">
        Pick the accent color used across the whole site — black and white stay fixed as the foundation; this
        controls the red.
      </p>

      <div className="card p-6 max-w-2xl">
        <AccentColorPicker currentColor={currentColor} />
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-1">Theme</h2>
      <p className="text-black/50 text-sm mb-6">
        Choose which color leads the site — white main is the current look; black main inverts it using the same
        ink/paper/red identity.
      </p>

      <div className="card p-6 max-w-2xl">
        <ThemeToggle currentTheme={currentTheme} />
      </div>
    </div>
  );
}
