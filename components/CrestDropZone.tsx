"use client";

import { useRef, useState } from "react";

// Crest picker for the application form: a real drop target with a live
// preview and the same client-side guards the organizer-side upload applies
// (type and size), so a manager finds out here rather than after submitting.
//
// The file is submitted with the form and stored on the application row, then
// copied onto the team when an organizer accepts. The server re-validates by
// sniffing the file's magic bytes — the checks below are a courtesy to save a
// round trip, not the security boundary.
const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function CrestDropZone() {
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function take(file: File | undefined) {
    if (!file) return;
    if (!OK_TYPES.includes(file.type)) {
      setError("Use a PNG, JPG, WEBP or SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setError(null);
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-xl border border-dashed p-5 transition-colors ${
          dragging ? "border-black/40 bg-black/[0.06]" : "border-line hover:bg-black/[0.03]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full border border-line bg-black/[0.04] flex items-center justify-center overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Club crest preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl" aria-hidden="true">🛡️</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{name || "Club crest"}</p>
            <p className="text-xs text-ink2 mt-0.5">Drop a badge here, or</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-ghost text-xs mt-2"
            >
              Choose file
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          name="crest"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => take(e.target.files?.[0])}
        />
      </div>
      {error ? (
        <p className="text-xs text-warning-500 mt-2">{error}</p>
      ) : (
        <p className="text-xs text-ink3 mt-2">
          Optional. Saved with your application and applied to your team the moment you&apos;re accepted.
        </p>
      )}
    </div>
  );
}
