/* eslint-disable @next/next/no-img-element -- next/og renders plain <img> tags */
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { OG_MARK_URI, ogFonts, ogPhoto, ogText } from "@/lib/og";
import { getLostFound } from "../../data";

export const runtime = "nodejs";

/** 1080×1350 poster image for WhatsApp status, society groups and Instagram. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const item = await getLostFound((await params).id, true);
  if (!item || item.is_hidden) return new Response("Not found", { status: 404 });
  const url = `${env.siteUrl}/lost/${item.id}`;
  const [qr, photo, fonts] = await Promise.all([
    QRCode.toDataURL(url, { margin: 1, width: 400, color: { dark: "#1a2233", light: "#ffffff" } }),
    ogPhoto(item.photo_urls[0]),
    ogFonts(),
  ]);
  const lost = item.type === "lost";
  const reunited = item.status === "reunited";
  const tone = reunited ? "#0e7c72" : lost ? "#c32f3a" : "#f6b21b";
  const ink = lost || reunited ? "#ffffff" : "#1a2233";
  const title = reunited ? "REUNITED" : `${lost ? "LOST" : "FOUND"} ${item.species.toUpperCase()}`;
  const details = [item.breed, item.gender !== "unknown" ? (item.gender === "male" ? "Male" : "Female") : null, item.color].filter(Boolean).join(" · ");
  const where = [item.landmark, item.last_seen_area].filter(Boolean).join(", ");
  const name = (item.pet_name ?? (lost ? "Please help" : `Found ${item.species}`)).toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Nunito" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: tone, color: ink, padding: "40px 0 30px" }}>
          <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 150, lineHeight: 1, letterSpacing: 8 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: 8, marginTop: 10 }}>{reunited ? "THANK YOU FOR SHARING" : lost ? "PLEASE HELP BRING ME HOME" : "IS THIS YOUR PET?"}</div>
        </div>
        <div style={{ display: "flex", margin: "34px 48px 0", height: 470, borderRadius: 28, overflow: "hidden", background: "#fff1cc" }}>
          {photo ? <img src={photo} alt="" width={984} height={470} style={{ width: 984, height: 470, objectFit: "cover" }} /> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "26px 56px 0" }}>
          <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 96, lineHeight: 1, color: "#1a2233" }}>{ogText(name)}</div>
          {details ? <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#1a2233", marginTop: 12 }}>{ogText(details)}</div> : null}
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#3b4456", marginTop: 8 }}>{ogText(`${lost ? "Last seen" : "Found near"}: ${where}`)}</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#3b4456", marginTop: 2 }}>{formatDate(item.last_seen_date, true)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", margin: "auto 48px 40px", gap: 30, paddingTop: 22, borderTop: "4px dashed #dde2ec" }}>
          <img src={qr} alt="" width={210} height={210} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 50, lineHeight: 1.05, color: "#1a2233" }}>Scan to message the {lost ? "owner" : "finder"}</div>
            {item.reward_text ? <div style={{ display: "flex", fontFamily: "Fredoka", fontSize: 58, color: "#c32f3a", marginTop: 10 }}>{ogText(item.reward_text)}</div> : null}
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32, fontWeight: 800, color: "#1a2233", marginTop: 12 }}>
              <img src={OG_MARK_URI} alt="" width={44} height={44} /> pupmeow · numbers stay private
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts,
      headers: { "Content-Disposition": `inline; filename="pupmeow-${lost ? "lost" : "found"}-${(item.pet_name ?? item.species).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png"`, "Cache-Control": "public, max-age=300" },
    },
  );
}
