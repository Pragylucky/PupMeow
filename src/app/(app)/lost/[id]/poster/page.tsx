import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ChevronLeft, Download } from "lucide-react";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { WithRail } from "@/components/layout/page-layout";
import { Steps, TipCard } from "@/components/brand/bits";
import { LogoMark } from "@/components/layout/logo";
import { ShareButtons } from "@/components/features/listings/share-buttons";
import { ButtonLink } from "@/components/ui/button";
import { getLostFound } from "../data";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Printable poster", robots: { index: false } };

/** Print-optimised A4 poster. Use the browser's "Save as PDF" to get a PDF. */
export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getLostFound(id);
  if (!item) notFound();
  const url = `${env.siteUrl}/lost/${item.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 320, color: { dark: "#1a2233", light: "#ffffff" } });
  const isLost = item.type === "lost";
  const kind = item.species === "dog" ? "DOG" : "CAT";
  const details = [item.breed, item.gender !== "unknown" ? (item.gender === "male" ? "Male" : "Female") : null, item.color].filter(Boolean).join(" · ");

  return (
    <WithRail
      rail={
        <>
          <TipCard tone="lost" title="Where to put it up">
            <Steps items={["At eye level, near where your pet was last seen.", "Society gates, guard rooms, chai stalls, vets and pet shops.", "Post the image in every society and RWA WhatsApp group."]} />
          </TipCard>
        </>
      }
    >
      <style>{`@page { size: A4; margin: 0; } @media print { body * { visibility: hidden !important; } #pm-poster, #pm-poster * { visibility: visible !important; } #pm-poster { position: fixed; inset: 0; width: 210mm !important; height: 297mm !important; max-width: none !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; } }`}</style>
      <div className="no-print mb-4 space-y-4">
        <Link href={`/lost/${item.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text"><ChevronLeft className="h-4 w-4" aria-hidden /> Back to the report</Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <ButtonLink href={`/lost/${item.id}/poster/image`} variant="whatsapp" size="lg" download target="_blank" rel="noopener">
            <Download className="h-5 w-5" aria-hidden /> Image for WhatsApp
          </ButtonLink>
        </div>
        <ShareButtons path={`/lost/${item.id}`} text={`${isLost ? "LOST" : "FOUND"} ${kind.toLowerCase()}${item.pet_name ? `: ${item.pet_name}` : ""} near ${item.last_seen_area}. Please share! 🐾`} size="sm" />
      </div>

      <section id="pm-poster" className="mx-auto flex aspect-[210/297] w-full max-w-[560px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white text-ink shadow-[var(--shadow-lift)]">
        <div className="flex flex-col items-center px-[6%] pb-[3%] pt-[4%] text-white" style={{ background: isLost ? "#c32f3a" : "#f6b21b", color: isLost ? "#fff" : "#1a2233" }}>
          <p className="font-heading text-[clamp(2.4rem,10vw,4.4rem)] font-bold leading-none tracking-[0.06em]">{item.status === "reunited" ? "REUNITED" : `${isLost ? "LOST" : "FOUND"} ${kind}`}</p>
          <p className="mt-1 text-[clamp(0.8rem,2.6vw,1.1rem)] font-extrabold uppercase tracking-[0.2em] opacity-90">{isLost ? "Please help bring me home" : "Is this your pet?"}</p>
        </div>
        <div className="relative mx-[6%] mt-[4%] aspect-[4/3] overflow-hidden rounded-xl bg-[#eef1f7]">
          {item.photo_urls[0] && <Image src={item.photo_urls[0]} alt={item.pet_name ?? item.species} fill sizes="560px" className="object-cover" priority />}
        </div>
        <div className="px-[6%] pt-[3%]">
          <p className="font-heading text-[clamp(2rem,8vw,3.4rem)] font-bold uppercase leading-none">{item.pet_name ?? `Found ${kind.toLowerCase()}`}</p>
          {details && <p className="mt-1 text-[clamp(0.95rem,3vw,1.35rem)] font-extrabold">{details}</p>}
          <p className="mt-1.5 text-[clamp(0.85rem,2.6vw,1.15rem)] font-semibold leading-snug">
            {isLost ? "Last seen" : "Found near"}: {[item.landmark, item.last_seen_area].filter(Boolean).join(", ")}
            <br />{formatDate(item.last_seen_date, true)}
          </p>
          {item.reward_text && <p className="mt-2 font-heading text-[clamp(1.4rem,5vw,2.2rem)] font-bold text-[#c32f3a]">{item.reward_text}</p>}
        </div>
        <div className="mt-auto flex items-center gap-[4%] border-t-2 border-dashed border-[#dde2ec] px-[6%] py-[4%]">
          <div className="aspect-square w-[34%] shrink-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to this report" role="img" />
          <div className="min-w-0">
            <p className="font-heading text-[clamp(1.1rem,4vw,1.8rem)] font-bold leading-tight">Scan to message the {isLost ? "owner" : "finder"}</p>
            <p className="mt-1 text-[clamp(0.75rem,2.3vw,1rem)] font-semibold text-[#3b4456]">Your number and theirs stay private.</p>
            <p className="mt-2 flex items-center gap-1.5 text-[clamp(0.75rem,2.3vw,1rem)] font-extrabold"><LogoMark size={22} /> pupmeow</p>
            <p className="break-all text-[clamp(0.6rem,1.8vw,0.8rem)] text-[#566174]">{url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      </section>
    </WithRail>
  );
}
