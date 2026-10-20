"use client";

export const MAX_EDGE = 1600;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Convert iPhone HEIC photos to JPEG in the browser (lazy-loads the converter only when needed). */
async function heicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image couldn't be read.")); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resize to max 1600px on the long edge and encode as WebP (JPEG fallback when the
 * browser can't encode WebP). Animated GIFs are kept as-is.
 */
export async function processImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" | "gif"; type: string }> {
  if (file.type === "image/gif") return { blob: file, ext: "gif", type: "image/gif" };
  const source: Blob = isHeic(file) ? await heicToJpeg(file) : file;
  const img = await loadImage(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const webp = await canvasToBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", type: "image/webp" };
  const jpg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (!jpg) throw new Error("Couldn't compress this image.");
  return { blob: jpg, ext: "jpg", type: "image/jpeg" };
}

export function validateFile(file: File, opts: { allowPdf?: boolean; maxBytes: number }): string | null {
  const isImage = file.type.startsWith("image/") || isHeic(file);
  const isPdf = file.type === "application/pdf";
  if (!isImage && !(opts.allowPdf && isPdf)) {
    return opts.allowPdf ? `${file.name}: only photos or PDF files are allowed.` : `${file.name}: only photos are allowed.`;
  }
  // HEIC/large photos are compressed before upload, so allow a generous raw size for images.
  const limit = isImage ? 25 * 1024 * 1024 : opts.maxBytes;
  if (file.size > limit) return `${file.name} is too large (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB).`;
  return null;
}
