"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ className }: { className?: string }) {
  return <Button size="lg" className={className} onClick={() => window.print()}><Printer className="h-5 w-5" aria-hidden /> Print or save PDF</Button>;
}
