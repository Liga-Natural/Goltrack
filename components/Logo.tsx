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

// The wordmark itself: Unbounded at weight 900 (font-logo, scoped to just
// this component — the rest of the site reads in Archivo Black). Each
// letter sits in its own span with a small hand-tuned negative margin,
// because Unbounded's default tracking reads too loose at this size/weight
// to feel like one solid word. Deliberately one accent, not a two-color
// split: the wordmark itself is solid (inherits the parent's text color, so
// it reads correctly on both light and dark backgrounds), with exactly one
// colored element — a small squared red full stop after the word.
export function Logo({
  className = "",
  markClassName = "h-8 w-8",
  showMark = true,
}: {
  className?: string;
  markClassName?: string;
  // The mark is a black tile with a white "J" — always ink-on-paper, not
  // color-inherited like the wordmark text is. On a dark section it would
  // disappear into the background, so callers on dark surfaces (see the
  // homepage's closing CTA band) render the wordmark alone instead.
  showMark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-logo font-black tracking-tight ${className}`}>
      {showMark && <LogoMark className={markClassName} />}
      <span className="inline-flex items-baseline">
        <span className="inline-block -mr-[0.07em]">J</span>
        <span className="inline-block -mr-[0.05em]">o</span>
        <span className="inline-block -mr-[0.04em]">g</span>
        <span className="inline-block">o</span>
        <span className="inline-block w-[0.16em] h-[0.16em] rounded-[1px] bg-pitch-400 ml-[0.08em] mb-[0.01em]" />
      </span>
    </span>
  );
}
