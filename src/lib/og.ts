import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Static brand fonts for next/og images (satori needs TTF/OTF, not WOFF2). */
export async function ogFonts() {
  const dir = join(process.cwd(), "src/app/fonts/og");
  const [fredoka, nunito, nunitoX] = await Promise.all([
    readFile(join(dir, "Fredoka-Bold.ttf")),
    readFile(join(dir, "Nunito-Bold.ttf")),
    readFile(join(dir, "Nunito-ExtraBold.ttf")),
  ]).catch(() => [null, null, null] as const);
  if (!fredoka || !nunito || !nunitoX) return undefined;
  return [
    { name: "Fredoka", data: fredoka, weight: 700 as const, style: "normal" as const },
    { name: "Nunito", data: nunito, weight: 700 as const, style: "normal" as const },
    { name: "Nunito", data: nunitoX, weight: 800 as const, style: "normal" as const },
  ];
}

/**
 * Photos are stored as WebP, which the OG renderer can't decode. Fetch and convert to JPEG,
 * returned as a data URI. Returns null if the photo can't be loaded.
 */
export async function ogPhoto(url: string | null | undefined, width = 1100): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (/jpe?g|png/.test(type)) return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Our OG fonts have no ₹ glyph. */
export function ogText(s: string | null | undefined) {
  return (s ?? "").replace(/₹\s?/g, "Rs ");
}

export const OG_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="30" fill="#0e7c72"/><path d="M42 39 q-26 -6 -26 30 q1 15 12 13 q10 -18 14 -43 z" fill="#d99a0f"/><path d="M76 40 l15 -19 l6 29 z" fill="#7a5af5"/><path d="M60 34 A34 34 0 0 0 60 102 Z" fill="#f6b21b"/><path d="M60 34 A34 34 0 0 1 60 102 Z" fill="#7a5af5"/><circle cx="47" cy="64" r="4.5" fill="#1a2233"/><circle cx="48.5" cy="62.5" r="1.4" fill="#fff"/><path d="M68 64 q5 -6 10 0" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M53 76 h14 l-7 8 z" fill="#1a2233"/><path d="M60 84 v4 m0 0 q-5 5 -10 1 m10 -1 q5 5 10 1" stroke="#1a2233" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
export const OG_MARK_URI = `data:image/svg+xml;base64,${Buffer.from(OG_MARK).toString("base64")}`;
