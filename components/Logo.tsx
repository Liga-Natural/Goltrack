// The wordmark, rendered from the supplied logotype
// (public/jogo-wordmark.png) rather than set as live text. The letterforms
// are a custom-drawn mark — the rounded single-storey "g" with its open
// descender and the square period aren't reproducible from Plus Jakarta
// Sans, so this has to be the real asset, not type styled to look like it.
//
// The asset is stored with the background keyed out to true transparency
// and the flat brand red baked into every pixel, so the same file works on
// the black canvas and the cream one without a light fringe on its edges.
//
// Its red is deliberately the file's own #E4162A rather than the site's
// configurable accent (--pitch-400): the logo is a constant piece of brand
// identity, and it shouldn't shift colour just because an organizer picks a
// different accent in Settings. Everything else on the page follows the
// accent; this one mark does not.
//
// Callers still pass a text-* size in wordmarkClassName, exactly as they did
// for the live-text version. That class lands on a wrapper span and the
// <img> is measured in em, so it inherits whatever font-size resolves there
// — one rule keeps every existing call site (text-sm through text-5xl)
// working without touching any of them.
export function Logo({
  className = "",
  wordmarkClassName = "text-xl",
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    // min-h-12 on the wrapper, not on the image: the wordmark is almost
    // always the target of a link back to the homepage, and at its natural
    // 27px it was the most-repeated undersized tap target in the app. The
    // extra height is empty space above and below the mark, so nothing moves
    // visually — the link just becomes something a thumb can hit.
    <span className={`inline-flex items-center min-h-12 ${className}`}>
      <span className={`${wordmarkClassName} inline-flex leading-none`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/jogo-wordmark.png"
          alt="Jogo"
          className="h-[1em] w-auto select-none"
          draggable={false}
        />
      </span>
    </span>
  );
}
