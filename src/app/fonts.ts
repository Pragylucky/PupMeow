import localFont from "next/font/local";

// Self-hosted variable fonts (SIL Open Font License) — no runtime request to Google.
export const fredoka = localFont({
  src: "./fonts/Fredoka-Variable.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
  fallback: ["Trebuchet MS", "system-ui", "sans-serif"],
});

export const nunito = localFont({
  src: "./fonts/Nunito-Variable.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});
