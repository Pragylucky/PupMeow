"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { ImagePlus, MapPin, HeartHandshake, PawPrint } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const CreateCtx = createContext<{ open: () => void } | null>(null);

const ACTIONS = [
  { href: "/post/new", title: "New post", desc: "Share a moment", icon: ImagePlus, tone: "bg-primary text-on-primary" },
  { href: "/lost/new", title: "Report lost or found", desc: "Alert people nearby", icon: MapPin, tone: "bg-danger text-white halftone" },
  { href: "/adopt/new", title: "Adoption listing", desc: "Free, never sold", icon: HeartHandshake, tone: "bg-secondary text-ink" },
  { href: "/pets/new", title: "Add a pet", desc: "Profile and vaccines", icon: PawPrint, tone: "bg-cat text-white" },
];

export function CreateSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  return (
    <CreateCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Modal open={isOpen} onClose={() => setOpen(false)} title="Create" variant="sheet">
        <ul className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                onClick={() => setOpen(false)}
                className={cn("flex min-h-32 flex-col justify-between rounded-[var(--radius-lg)] p-4 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5", a.tone)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-heading text-[1.15rem] font-semibold leading-tight">{a.title}</span>
                  <span className="block text-[0.85rem] font-semibold opacity-85">{a.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
    </CreateCtx.Provider>
  );
}

export function useCreateSheet() {
  const ctx = useContext(CreateCtx);
  if (!ctx) throw new Error("useCreateSheet must be used inside CreateSheetProvider");
  return ctx;
}

export function CreateButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useCreateSheet();
  return (
    <button type="button" onClick={open} className={className} aria-haspopup="dialog">
      {children}
    </button>
  );
}
