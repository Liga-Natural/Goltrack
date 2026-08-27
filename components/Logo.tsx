// LogoMark: a rounded-square tile carrying just the initial "J" — used
// standalone (marketing CTA, compact sidebar contexts) and inline in Logo
// below. Always renders in ink-on-paper regardless of the page's own text
// color, since it's a self-contained tile rather than inline lettering.
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`${className} bg-black rounded-lg flex items-center justify-center font-logo font-black text-white shrink-0`}
      aria-hidden="true"
    >
      J
    </span>
  );
}

// The wordmark: the actual brand logo file (public/jogo-wordmark.png),
// not a font-based reconstruction — a custom-drawn logotype isn't
// something a font pairing + CSS letter-spacing hacks can faithfully
// reproduce. Its red is fixed at the file's own brand red (#E4162A),
// independent of the site's configurable accent color: the logo is a
// constant piece of brand identity, not something that should shift
// if an organizer picks a different accent from Settings.
export function Logo({
  className = "",
  markClassName = "h-8 w-8",
  wordmarkClassName = "h-6",
  showMark = true,
}: {
  className?: string;
  markClassName?: string;
  // Raster image, so it scales by explicit height rather than inheriting
  // font-size the way the old letter-span wordmark did — callers that
  // want a bigger/smaller wordmark pass a height class here instead of a
  // text-size class on the wrapper.
  wordmarkClassName?: string;
  // The mark is a black tile with a white "J" — always ink-on-paper, not
  // color-inherited like the wordmark text is. On a dark section it would
  // disappear into the background, so callers on dark surfaces (see the
  // homepage's closing CTA band) render the wordmark alone instead.
  showMark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {showMark && <LogoMark className={markClassName} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jogo-wordmark.png" alt="Jogo" className={`${wordmarkClassName} w-auto`} />
    </span>
  );
}
