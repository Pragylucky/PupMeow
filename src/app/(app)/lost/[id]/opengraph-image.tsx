import { ImageResponse } from "next/og";
import { OG_MARK_URI, ogFonts, ogPhoto, ogText } from "@/lib/og";
import { getLostFound, lostHeadline } from "./data";

export const alt = "Lost or found pet on Pupmeow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** WhatsApp / Instagram / X preview: pet photo + "LOST: Bruno, Labrador, last seen Dwarka Sec 10". */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const item = await getLostFound((await params).id, true);
  const [photo, fonts] = await Promise.all([ogPhoto(item?.photo_urls[0], 700), ogFonts()]);
  const reunited = item?.status === "reunited";
  const tone = !item ? "#0e7c72" : reunited ? "#0e7c72" : item.type === "lost" ? "#c32f3a" : "#f6b21b";
  const ink = item?.type === "found" && !reunited ? "#1a2233" : "#ffffff";
  const label = !item ? "PUPMEOW" : reunited ? "REUNITED" : item.type === "lost" ? "LOST" : "FOUND";
  const rest = item ? lostHeadline(item).replace(/^[A-Z]+: /, "") : "Delhi's pet community";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: tone, color: ink, fontFamily: "Nunito" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 48px 48px 60px", width: 640 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 140, lineHeight: 1, letterSpacing: 6 }}>{label}</div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 46, fontWeight: 800, lineHeight: 1.15 }}>{ogText(rest)}</div>
            {item?.reward_text ? <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 22, fontSize: 34, fontWeight: 800, background: "#ffffff", color: "#c32f3a", padding: "8px 22px", borderRadius: 999 }}>{ogText(item.reward_text)}</div> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800 }}>
            <img src={OG_MARK_URI} alt="" width={52} height={52} />
            pupmeow · {reunited ? "thank you for sharing!" : "please share, tap to help"}
          </div>
        </div>
        <div style={{ display: "flex", width: 560, height: "100%", padding: "40px 40px 40px 0" }}>
          <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: 32, overflow: "hidden", background: "#fff1cc", border: "10px solid #fff1cc" }}>
            {photo ? <img src={photo} alt="" width={500} height={530} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }} /> : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
