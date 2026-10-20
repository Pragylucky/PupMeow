"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deletePet } from "@/lib/actions/pets";

export function DeletePetButton({ petId, name }: { petId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Button variant="danger-ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        destructive
        loading={busy}
        title={`Delete ${name}?`}
        description="This removes the pet profile, health records and match profile. Posts stay but lose the pet tag."
        confirmLabel="Delete pet"
        onConfirm={async () => {
          setBusy(true);
          const res = await deletePet(petId);
          setBusy(false);
          if (res.ok) { toast(res.message ?? "Deleted"); router.push("/pets"); }
          else toast(res.error, "error");
        }}
      />
    </>
  );
}
