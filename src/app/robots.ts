import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/lost", "/adopt", "/pet/", "/about", "/privacy", "/terms", "/guidelines", "/contact"],
      disallow: ["/home", "/feed", "/post/", "/search", "/notifications", "/pets", "/assistant", "/settings", "/onboarding", "/admin", "/match", "/u/", "/tag/", "/api/", "/auth/", "/login", "/lost/new", "/adopt/new", "/*/poster"],
    }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
    host: env.siteUrl,
  };
}
