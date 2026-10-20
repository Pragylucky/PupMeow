"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Flag, Ban, Trash2, Pencil } from "lucide-react";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { toggleBlock } from "@/lib/actions/profile";
import { ReportDialog } from "./report-dialog";
import type { ReportTarget } from "@/types/database";

/** "⋯" menu with Report, Block (others' content) and Edit/Delete (own content). */
export function ContentMenu({
  targetType, targetId, ownerId, viewerId, ownerName, onDelete, editHref, onEdit, label = "More options",
}: {
  targetType: ReportTarget;
  targetId: string;
  ownerId: string;
  viewerId: string | null;
  ownerName?: string;
  onDelete?: () => Promise<{ ok: boolean; error?: string; message?: string }>;
  editHref?: string;
  onEdit?: () => void;
  label?: string;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "block" | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const isOwn = viewerId === ownerId;

  if (!viewerId) return null;

  const items: MenuItem[] = [
    { label: "Edit", icon: <Pencil className="h-4 w-4" />, href: editHref, onSelect: onEdit, hidden: !isOwn || (!editHref && !onEdit) },
    { label: "Delete", icon: <Trash2 className="h-4 w-4" />, onSelect: () => setConfirm("delete"), danger: true, hidden: !isOwn || !onDelete },
    { label: "Report", icon: <Flag className="h-4 w-4" />, onSelect: () => setReportOpen(true), hidden: isOwn },
    { label: `Block ${ownerName ?? "user"}`, icon: <Ban className="h-4 w-4" />, onSelect: () => setConfirm("block"), danger: true, hidden: isOwn },
  ];

  return (
    <>
      <DropdownMenu label={label} trigger={<MoreHorizontal className="h-5 w-5" />} items={items} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType={targetType} targetId={targetId} />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        loading={busy}
        destructive
        title={confirm === "delete" ? "Delete this?" : `Block ${ownerName ?? "this user"}?`}
        description={confirm === "delete" ? "This can't be undone." : "You won't see each other's posts, comments or listings. They won't be told."}
        confirmLabel={confirm === "delete" ? "Delete" : "Block"}
        onConfirm={async () => {
          setBusy(true);
          const res = confirm === "delete" ? await onDelete!() : await toggleBlock(ownerId, true);
          setBusy(false);
          setConfirm(null);
          if (res.ok) {
            toast(res.message ?? (confirm === "delete" ? "Deleted" : "Blocked"));
            router.refresh();
          } else toast(res.error ?? "Something went wrong", "error");
        }}
      />
    </>
  );
}
