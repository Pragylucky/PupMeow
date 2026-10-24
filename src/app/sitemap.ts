import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages: MetadataRoute.Sitemap = ["", "/lost", "/adopt", "/about", "/guidelines", "/privacy", "/terms", "/contact"].map((p) => ({
    url: `${base}${p}`, changeFrequency: p === "/lost" || p === "/adopt" ? "hourly" : "monthly", priority: p === "" ? 1 : 0.7,
  }));
  try {
    const supabase = createPublicClient();
    const [lost, adopt] = await Promise.all([
      supabase.from("lost_found").select("id, updated_at").eq("is_hidden", false).order("created_at", { ascending: false }).limit(2000),
      supabase.from("adoptions").select("id, updated_at").eq("is_hidden", false).order("created_at", { ascending: false }).limit(2000),
    ]);
    return [
      ...staticPages,
      ...(lost.data ?? []).map((r: { id: string; updated_at: string }) => ({ url: `${base}/lost/${r.id}`, lastModified: r.updated_at, changeFrequency: "daily" as const, priority: 0.8 })),
      ...(adopt.data ?? []).map((r: { id: string; updated_at: string }) => ({ url: `${base}/adopt/${r.id}`, lastModified: r.updated_at, changeFrequency: "daily" as const, priority: 0.8 })),
    ];
  } catch {
    return staticPages;
  }
}
