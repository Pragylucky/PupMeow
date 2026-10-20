import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pupmeow — Delhi's pet community",
    short_name: "Pupmeow",
    description: "Share moments, find lost pets, adopt and get AI pet care help in Delhi NCR.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f7fb",
    theme_color: "#0e7c72",
    categories: ["social", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Report lost pet", url: "/lost/new", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "New post", url: "/post/new", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
  };
}
