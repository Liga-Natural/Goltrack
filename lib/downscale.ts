/**
 * Shrinks an image in the browser before it is ever uploaded.
 *
 * A phone camera photo is around 4000x3000 and 3-5MB. The gallery renders it
 * into a 358x192 box — about 28 times fewer pixels than were sent — and the
 * same original is what the server stores and what every later visitor
 * downloads. Nothing in the stack resized it: there is no image CDN here, and
 * no native resizing library installed, so the only place the full-size file
 * can be avoided is before it leaves the device.
 *
 * Doing it client-side also fixes the storage half of the problem, which a
 * server-side thumbnail would not: the 8MB original never reaches the
 * database at all.
 *
 * Deliberately conservative:
 *  - An image already within the cap is returned untouched, so a photo that
 *    needs nothing is not re-encoded and degraded for no reason.
 *  - If anything fails — an unreadable file, no canvas, a browser that will
 *    not encode — the original file is returned and the upload proceeds. A
 *    resize is an optimisation; it must never be the reason a parent cannot
 *    post a photo of their kid.
 *  - The result is only used if it is actually smaller.
 */
export const MAX_UPLOAD_EDGE = 1600;

export async function downscaleImage(file: File, maxEdge = MAX_UPLOAD_EDGE): Promise<File> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= maxEdge) {
      bitmap.close?.();
      return file;
    }

    const scale = maxEdge / longest;
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
    );
    if (!blob || blob.size >= file.size) return file;

    // Renamed to .jpg because it is now a JPEG whatever it started as; the
    // server sniffs magic bytes rather than trusting the name, but a stored
    // filename that lies about its contents is a trap for the next person.
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
