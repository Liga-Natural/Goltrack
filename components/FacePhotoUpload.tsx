"use client";

import { useCallback, useRef, useState } from "react";

// A real face detector, running in the applicant's browser. The model is a
// TinyFaceDetector (190KB of weights) served from this app's own /models
// directory, with the runtime vendored into /vendor — no third-party API and
// no CDN, so a registration form still works on a locked-down network and no
// photograph of a child is posted to someone else's server to be scored.
//
// It is loaded on first use rather than imported at the top of the file: the
// runtime is 1.3MB, and someone who never reaches this step should never pay
// for it. `webpackIgnore` keeps it out of the build graph so it stays a
// runtime fetch of a static asset rather than a bundled dependency.

type Detection = { score: number; box: { x: number; y: number; width: number; height: number } };

let apiPromise: Promise<any> | null = null;
async function loadFaceApi(): Promise<any> {
  if (!apiPromise) {
    apiPromise = (async () => {
      const mod = await import(/* webpackIgnore: true */ "/vendor/face-api.esm.js" as any);
      const api = mod.default ?? mod;
      await api.nets.tinyFaceDetector.loadFromUri("/models");
      return api;
    })();
  }
  return apiPromise;
}

export type FaceResult = { status: "PASSED" | "FAILED"; score: number };

export function FacePhotoUpload({
  onResult,
  name = "photo",
}: {
  onResult?: (result: FaceResult | null) => void;
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<FaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const analyse = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      onResult?.(null);

      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
        setError("That file is not a photo. Upload a PNG, JPG or WEBP headshot.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError("That photo is over 8MB. Upload a smaller one.");
        return;
      }

      const url = URL.createObjectURL(file);
      setPreview(url);
      setChecking(true);
      try {
        const api = await loadFaceApi();
        const img = new Image();
        img.src = url;
        await img.decode();
        const detections: Detection[] = await api.detectAllFaces(
          img,
          new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
        );

        if (detections.length === 0) {
          const failed: FaceResult = { status: "FAILED", score: 0 };
          setResult(failed);
          onResult?.(failed);
          return;
        }
        // More than one face is its own kind of wrong: a team photo passes a
        // "is there a face" test while being useless as an identity headshot.
        if (detections.length > 1) {
          const failed: FaceResult = { status: "FAILED", score: 0 };
          setResult(failed);
          setError(`${detections.length} faces detected. Upload a photo of the player alone.`);
          onResult?.(failed);
          return;
        }
        const best = detections[0];
        const passed: FaceResult = { status: "PASSED", score: Math.round(best.score * 100) };
        setResult(passed);
        onResult?.(passed);
      } catch (err) {
        // A detector that cannot load must not quietly become a pass.
        setError("The face check could not run in this browser. Try again, or use a different device.");
        const failed: FaceResult = { status: "FAILED", score: 0 };
        setResult(failed);
        onResult?.(failed);
      } finally {
        setChecking(false);
      }
    },
    [onResult]
  );

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    // Keep the real file on the input so it posts with the form.
    if (inputRef.current && files) inputRef.current.files = files;
    void analyse(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-pitch-400 bg-pitch-400/10" : "border-line hover:border-black/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={preview}
              alt="Headshot preview"
              className="h-32 w-32 rounded-full object-cover border border-line"
            />
            <span className="text-xs text-ink2">Click to choose a different photo</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-inkDisplay">Drop a headshot here</p>
            <p className="text-[11px] text-ink3">
              Face forward, on your own, well lit. PNG, JPG or WEBP up to 8MB.
            </p>
          </div>
        )}
      </div>

      {checking && (
        <p className="text-xs text-ink2" role="status">
          Checking the photo for a face…
        </p>
      )}

      {result?.status === "FAILED" && !checking && (
        <div className="rounded-xl border border-warning-500/40 bg-warning-500/10 p-3" role="alert">
          <p className="text-sm font-semibold text-warning-500">
            No clear face detected. Please upload a direct headshot photo.
          </p>
          {error && <p className="text-[11px] text-ink2 mt-1">{error}</p>}
        </div>
      )}

      {result?.status === "PASSED" && !checking && (
        <div className="rounded-xl border border-pitch-400/40 bg-pitch-400/10 p-3">
          <p className="text-sm font-semibold text-pitch-600">
            Face detected — {result.score}% confidence.
          </p>
          <p className="text-[11px] text-ink2 mt-1">
            This check runs on your device as a first pass. An organizer still reviews your photo and document
            before you can be named in a matchday squad.
          </p>
        </div>
      )}

      {error && !result && (
        <p className="text-xs text-warning-500" role="alert">
          {error}
        </p>
      )}

      <input type="hidden" name="faceStatus" value={result?.status ?? ""} />
      <input type="hidden" name="faceScore" value={result?.score ?? ""} />
    </div>
  );
}
