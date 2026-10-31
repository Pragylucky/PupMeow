"use client";

import { ToastProvider } from "@/components/ui/toast";
import { SpeciesProvider } from "@/components/features/species/species-context";
import type { SpeciesPref } from "@/types/database";

export function Providers({ children, initialSpecies }: { children: React.ReactNode; initialSpecies: SpeciesPref }) {
  return (
    <ToastProvider>
      <SpeciesProvider initial={initialSpecies}>{children}</SpeciesProvider>
    </ToastProvider>
  );
}
