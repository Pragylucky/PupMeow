import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<div style={{ display: "flex", width: 180, height: 180, background: "#0e7c72" }}><BrandMark size={180} /></div>, size);
}
