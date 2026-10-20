"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export function WelcomeToast({ path = "/home" }: { path?: string }) {
  const toast = useToast();
  useEffect(() => {
    toast("Welcome to Pupmeow! 🐾");
    window.history.replaceState(null, "", path);
  }, [toast, path]);
  return null;
}
