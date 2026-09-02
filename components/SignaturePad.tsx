"use client";

import { useEffect, useRef, useState } from "react";

// A signature is drawn with pointer events, so one code path covers a finger,
// a stylus and a mouse. What it produces is a PNG of a signature — the same
// evidentiary weight as the scribble on a paper match card, which is what this
// replaces. It is not a cryptographic e-signature and the label says so.
export function SignaturePad({
  name,
  label,
  existing,
}: {
  name: string;
  label: string;
  existing?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [value, setValue] = useState<string>(existing ?? "");
  const [drawing, setDrawing] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // The canvas is sized to its own layout box times the device pixel ratio,
  // or the stroke is a blurry double-width smear on every phone.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = box.width * ratio;
    canvas.height = box.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Ink is a literal near-black: the signature is stored as a PNG and shown
    // back on a white report, so it must not follow the app's theme.
    ctx.strokeStyle = "#111111";
    if (existing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, box.width, box.height);
      img.src = existing;
    }
  }, [existing]);

  function at(e: React.PointerEvent<HTMLCanvasElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    last.current = at(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const now = at(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(now.x, now.y);
    ctx.stroke();
    last.current = now;
  }

  function end() {
    setDrawing(false);
    last.current = null;
    const canvas = canvasRef.current;
    if (canvas) setValue(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setValue("");
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">{label}</span>
        <button type="button" className="text-[11px] text-ink3 underline" onClick={clear}>
          Clear
        </button>
      </div>
      {/* White plate: a signature has to be legible on the printed report, and
          drawing dark ink on the dark canvas would make it invisible here. */}
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-28 rounded-xl bg-[#ffffff] border border-line touch-none block"
        aria-label={`${label} — sign here`}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
