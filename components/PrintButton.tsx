"use client";

// window.print() needs a client component; the page around it stays a server
// component so the rosters are fetched on the server, not shipped as JSON.
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary text-sm shrink-0">
      Print game cards
    </button>
  );
}
