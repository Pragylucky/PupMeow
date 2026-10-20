"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, RotateCcw, Trash2 } from "lucide-react";
import { setAdoptionStatus, deleteAdoption } from "@/lib/actions/adoptions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export function AdoptionOwnerActions({ id, status, name }: { id: string; status: "available" | "adopted"; name: string }) {
  const [pending, start] = useTransition();
  const [del, setDel] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const set = (s: "available" | "adopted") => start(async () => {
    const r = await setAdoptionStatus(id, s);
    toast(r.ok ? r.message ?? "Updated" : r.error, r.ok ? "success" : "error");
    router.refresh();
  });
  return (
    <section aria-label="Your listing" className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-heading text-xl font-semibold">This is your listing</p>
      {status === "available" ? (
        <>
          <Button size="lg" variant="teal" className="w-full" loading={pending} onClick={() => set("adopted")}>{!pending && <Heart className="h-5 w-5" aria-hidden />} {name} found a home!</Button>
          <p className="text-sm text-muted">Mark it adopted so people stop asking. It moves to Happy tails.</p>
        </>
      ) : (
        <Button variant="outline" loading={pending} onClick={() => set("available")}><RotateCcw className="h-4 w-4" aria-hidden /> Reopen listing</Button>
      )}
      <div className="border-t border-border pt-3">
        <Button variant="danger-ghost" size="sm" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete listing</Button>
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} destructive title="Delete this listing?" confirmLabel="Delete" onConfirm={async () => {
        const r = await deleteAdoption(id);
        setDel(false);
        if (r.ok) { toast(r.message ?? "Deleted"); router.push("/adopt"); } else toast(r.error, "error");
      }} />
    </section>
  );
}
