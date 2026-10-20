import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }, { size: "maskable-512" }];
}

/** PWA icons: /pwa-icon/192, /pwa-icon/512, /pwa-icon/maskable-512 (extra padding for Android masks). */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const maskable = size.startsWith("maskable");
  const px = maskable ? 512 : size === "192" ? 192 : 512;
  return new ImageResponse(
    <div style={{ display: "flex", width: px, height: px, background: "#0e7c72", alignItems: "center", justifyContent: "center" }}>
      <BrandMark size={maskable ? Math.round(px * 0.72) : px} />
    </div>,
    { width: px, height: px },
  );
}
