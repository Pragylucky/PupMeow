/** Caption sent with the poster image to WhatsApp groups. */
export function lostShareText({ headline, area, reward, reunited }: { headline: string; area: string; reward?: string | null; reunited?: boolean }): string {
  if (reunited) return `${headline} 🎉 Thank you to everyone who shared!`;
  return [`${headline}`, `📍 ${area}`, reward ? `🎁 ${reward}` : null, "Please share in your society groups 🐾"].filter(Boolean).join("\n");
}

/** 9876543210 / +919876543210 -> "+91 98765 43210" (falls back to the input). */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return ten.length === 10 ? `+91 ${ten.slice(0, 5)} ${ten.slice(5)}` : raw;
}

export function posterFilename(item: { type: string; pet_name: string | null; species: string }): string {
  const slug = (item.pet_name ?? item.species).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `pupmeow-${item.type === "lost" ? "lost" : "found"}-${slug || "pet"}.png`;
}
