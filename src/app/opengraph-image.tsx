import { ImageResponse } from "next/og";
import { OG_MARK_URI, ogFonts, ogText } from "@/lib/og";

export const alt = "Pupmeow — Delhi's pet community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0e7c72 0%, #0a5f57 55%, #1a2233 100%)",
          color: "#fff1cc",
          padding: "56px 64px",
          fontFamily: "Nunito",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 88, lineHeight: 1, letterSpacing: 2 }}>Pupmeow</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 44, fontWeight: 800, lineHeight: 1.15, maxWidth: 900 }}>
            {ogText("Lost pets, free adoption & playdates for dog and cat families in Delhi NCR")}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 800 }}>
          <img src={OG_MARK_URI} alt="" width={56} height={56} />
          pupmeow.in · share to help reunite pets
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
