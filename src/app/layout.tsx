import type { Metadata, Viewport } from "next";
import { fredoka, nunito } from "./fonts";
import { env } from "@/lib/env";
import { Providers } from "@/components/layout/providers";
import { getSpeciesPref } from "@/lib/species-server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  manifest: "/manifest.webmanifest",
  title: { default: "Pupmeow — Delhi's pet community", template: "%s · Pupmeow" },
  description:
    "Share your pet's moments, find lost pets, adopt, set up playdates and get friendly AI pet care help. Made for dog and cat families in Delhi NCR.",
  applicationName: "Pupmeow",
  keywords: ["pets Delhi", "lost dog Delhi", "adopt a cat Delhi", "dog adoption NCR", "pet community India"],
  openGraph: { type: "website", siteName: "Pupmeow", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Pupmeow", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e7c72" },
    { media: "(prefers-color-scheme: dark)", color: "#10151f" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const species = await getSpeciesPref();
  return (
    <html lang="en-IN" className={`${fredoka.variable} ${nunito.variable}`} data-species={species} suppressHydrationWarning>
      <head>
        <script
          // Apply the saved light/dark choice before paint to avoid a flash.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pupmeow:theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        {process.env.NODE_ENV === "production" ? (
          <script
            // Register before React hydrates so PWA auditors (PWABuilder) detect the service worker.
            dangerouslySetInnerHTML={{
              __html: `if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(function(){})}`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[100] rounded-full bg-primary px-4 py-2 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <Providers initialSpecies={species}>{children}</Providers>
      </body>
    </html>
  );
}
