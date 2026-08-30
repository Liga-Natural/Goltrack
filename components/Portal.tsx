"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children at document.body.
//
// Necessary, not stylistic: every .card in this design carries
// backdrop-filter, and backdrop-filter — like filter — makes an element a
// containing block for its position:fixed descendants. A modal rendered
// inside a card is therefore positioned and clipped against that card
// rather than the viewport, which is exactly how the manager gate came out
// cropped at the panel's bottom edge. Portalling to body sidesteps the
// whole class of bug for any overlay that happens to live inside a panel.
//
// The mounted guard exists because document doesn't exist during SSR;
// rendering null on the server and the portal after hydration keeps the
// markup identical on both passes.
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
