// The wordmark, set as live text rather than the raster logotype
// (public/jogo-wordmark.png) this used to render. The standalone "J" tile
// that sat beside it is gone entirely — the brand now reads purely as
// typography.
//
// Its red is deliberately a fixed hex rather than the site's configurable
// accent (--pitch-400): the logo is a constant piece of brand identity, and
// it shouldn't shift colour just because an organizer picks a different
// accent in Settings. Everything else on the page follows the accent; this
// one mark does not.
//
// Sized by a text-* class, not the h-* classes the old <img> needed —
// callers pass a font size now, since there's no raster asset whose height
// drives the layout.
export function Logo({
  className = "",
  wordmarkClassName = "text-xl",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span
        className={`${wordmarkClassName} font-display font-extrabold tracking-[-0.04em] text-[#FF4D4D] leading-none`}
      >
        Jogo.
      </span>
    </span>
  );
}
