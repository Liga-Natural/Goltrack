import { SiteSettings } from "@/lib/models";
import { AccentColorPicker } from "@/components/AccentColorPicker";

export default function SettingsPage() {
  const currentColor = SiteSettings.getAccentColor();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Branding</h1>
      <p className="text-black/50 text-sm mb-6">Pick the accent color used across the whole site.</p>

      <div className="card p-6 max-w-2xl">
        <AccentColorPicker currentColor={currentColor} />
      </div>
    </div>
  );
}
