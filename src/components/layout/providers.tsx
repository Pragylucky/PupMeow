"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { SpeciesProvider } from "@/components/features/species/species-context";
import type { SpeciesPref } from "@/types/database";

export function Providers({ children, initialSpecies }: { children: React.ReactNode; initialSpecies: SpeciesPref }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <ToastProvider>
      <SpeciesProvider initial={initialSpecies}>{children}</SpeciesProvider>
    </ToastProvider>
  );
}
