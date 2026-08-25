"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permissions can be denied — the link is still visible to copy by hand
    }
  }

  return (
    <button onClick={copy} className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
