import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  const base = env.siteUrl.replace(/\/$/, "");
  return {
    id: `${base}/`,
    name: "Pupmeow — Delhi's pet community",
    short_name: "Pupmeow",
    description: "Share moments, find lost pets, adopt and get AI pet care help in Delhi NCR.",
    start_url: `${base}/home`,
    scope: `${base}/`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    dir: "ltr",
    background_color: "#f5f7fb",
    theme_color: "#0e7c72",
    categories: ["social", "lifestyle"],
    lang: "en-IN",
    prefer_related_applications: false,
    icons: [
      { src: `${base}/pwa-icon/144`, sizes: "144x144", type: "image/png", purpose: "any" },
      { src: `${base}/pwa-icon/192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/pwa-icon/384`, sizes: "384x384", type: "image/png", purpose: "any" },
      { src: `${base}/pwa-icon/512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/pwa-icon/maskable-512`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: `${base}/pwa/screenshot-narrow.png`,
        sizes: "888x612",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: `${base}/pwa/screenshot-wide.png`,
        sizes: "933x584",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    shortcuts: [
      { name: "Report lost pet", url: "/lost/new", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "New post", url: "/post/new", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
  };
}
