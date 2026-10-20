import { ImageResponse } from "next/og";
import { OG_MARK_URI, ogFonts, ogPhoto, ogText } from "@/lib/og";
import { getAdoption } from "./data";

export const alt = "Pet for adoption on Pupmeow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const a = await getAdoption((await params).id, true);
  const [photo, fonts] = await Promise.all([ogPhoto(a?.photo_urls[0], 700), ogFonts()]);
  const adopted = a?.status === "adopted";
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: adopted ? "#0e7c72" : "#f6b21b", color: adopted ? "#ffffff" : "#1a2233", fontFamily: "Nunito" }}>
        <div style={{ display: "flex", width: 560, height: "100%", padding: "40px 0 40px 40px" }}>
          <div style={{ display: "flex", width: "100%", height: "100%", borderRadius: 32, overflow: "hidden", background: "#fff1cc", border: "10px solid #ffffff" }}>
            {photo ? <img src={photo} alt="" width={500} height={530} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }} /> : null}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 48px", width: 640 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignSelf: "flex-start", background: "#1a2233", color: "#ffffff", fontSize: 30, fontWeight: 800, padding: "8px 22px", borderRadius: 999 }}>
              {adopted ? "ADOPTED" : "FREE ADOPTION · NEVER SOLD"}
            </div>
            <div style={{ display: "flex", marginTop: 26, fontFamily: "Fredoka", fontSize: 110, lineHeight: 1 }}>{ogText(a?.pet_name ?? "Pupmeow")}</div>
            {a ? <div style={{ display: "flex", marginTop: 16, fontSize: 38, fontWeight: 800 }}>{ogText([a.breed, a.age_text, a.area].filter(Boolean).join(" · "))}</div> : null}
            {a?.is_ngo && a.org_name ? <div style={{ display: "flex", marginTop: 10, fontSize: 30, fontWeight: 700 }}>via {ogText(a.org_name)}</div> : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800 }}>
            <img src={OG_MARK_URI} alt="" width={52} height={52} /> pupmeow · adopt, don&apos;t shop
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
