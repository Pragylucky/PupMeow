"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Check, Ban, RotateCcw, Trash2 } from "lucide-react";
import { adminSetHidden, adminSetBan, adminResolveReport, adminDeleteTarget } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ReportStatus, ReportTarget } from "@/types/database";

function useRun() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => start(async () => {
    const r = await fn();
    toast(r.ok ? r.message ?? "Done" : r.error ?? "Failed", r.ok ? "success" : "error");
    router.refresh();
  });
  return { pending, run };
}

const resolveAll = async (ids: string[], status: ReportStatus) => {
  let last: { ok: boolean; error?: string; message?: string } = { ok: true };
  for (const id of ids) {
    last = await adminResolveReport(id, status);
    if (!last.ok) return last;
  }
  return last;
};

export function ReportActions({
  reportIds,
  status,
  targetType,
  targetId,
  hidden,
  contentExists,
  ownerId,
  ownerBanned,
}: {
  reportIds: string[];
  status: ReportStatus;
  targetType: ReportTarget;
  targetId: string;
  hidden: boolean;
  contentExists: boolean;
  ownerId: string | null;
  ownerBanned: boolean;
}) {
  const { pending, run } = useRun();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const label = targetType === "post" ? "post" : targetType === "comment" ? "comment" : targetType === "lost_found" ? "report" : targetType === "adoption" ? "listing" : targetType === "match_profile" ? "profile" : "profile";
  const canModerateContent = targetType !== "profile" && contentExists;
  const isProfileReport = targetType === "profile";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading text-lg font-semibold">Hide or delete</h3>
        <p className="mt-0.5 text-sm text-muted">
          {isProfileReport ? "Profile reports: restrict or ban the user below." : "Hide removes it from the app for review. Delete removes it permanently."}
        </p>
      </div>
      {!contentExists && !isProfileReport && (
        <p className="rounded-[var(--radius-md)] bg-surface-2 px-3 py-2 text-sm font-semibold text-muted">This content was already deleted. Resolve or dismiss the reports below.</p>
      )}
      {canModerateContent && (
        <div className="flex flex-wrap gap-2">
          {hidden ? (
            <Button variant="outline" disabled={pending} onClick={() => run(() => adminSetHidden(targetType, targetId, false))}>
              <Eye className="h-4 w-4" aria-hidden /> Unhide {label}
            </Button>
          ) : (
            <Button variant="soft" disabled={pending} onClick={() => run(() => adminSetHidden(targetType, targetId, true))}>
              <EyeOff className="h-4 w-4" aria-hidden /> Hide
            </Button>
          )}
          <Button variant="danger" disabled={pending} onClick={() => { setDeleteReason(""); setDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </Button>
        </div>
      )}
      {isProfileReport && contentExists && ownerId && (
        <div className="flex flex-wrap gap-2">
          {hidden ? (
            <Button variant="outline" disabled={pending} onClick={() => run(() => adminSetHidden("profile", targetId, false))}>
              <Eye className="h-4 w-4" aria-hidden /> Unrestrict user
            </Button>
          ) : (
            <Button variant="soft" disabled={pending} onClick={() => run(() => adminSetHidden("profile", targetId, true))}>
              <EyeOff className="h-4 w-4" aria-hidden /> Hide profile (ban)
            </Button>
          )}
        </div>
      )}
      {ownerId && <BanButton userId={ownerId} banned={ownerBanned} big />}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {status === "open" ? (
          <>
            <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "resolved"))}><Check className="h-4 w-4" aria-hidden /> Mark resolved</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "dismissed"))}>Dismiss</Button>
          </>
        ) : <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "open"))}><RotateCcw className="h-4 w-4" aria-hidden /> Reopen</Button>}
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        destructive
        title={`Delete this ${label}?`}
        description="This cannot be undone. Photos and text will be removed from Pupmeow. Open reports for this item will be marked resolved."
        confirmLabel="Delete permanently"
        loading={pending}
        confirmDisabled={deleteReason.trim().length < 3}
        onConfirm={() => {
          const reason = deleteReason.trim();
          setDeleteOpen(false);
          run(async () => {
            const del = await adminDeleteTarget(targetType, targetId, reason);
            return del;
          });
        }}
      >
        <Textarea
          label="Reason (saved in audit log)"
          name="delete_reason"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Scam adoption listing with rehoming fee…"
        />
      </ConfirmDialog>
    </div>
  );
}

/** Compact Hide / Delete on each queue row (desktop). */
export function ReportRowActions(props: {
  targetType: ReportTarget;
  targetId: string;
  hidden: boolean;
  contentExists: boolean;
}) {
  const { targetType, targetId, hidden, contentExists } = props;
  const { pending, run } = useRun();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  if (targetType === "profile" || !contentExists) return null;

  return (
    <>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
        {hidden ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => adminSetHidden(targetType, targetId, false))}>Unhide</Button>
        ) : (
          <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => adminSetHidden(targetType, targetId, true))}>Hide</Button>
        )}
        <Button size="sm" variant="danger" disabled={pending} onClick={() => { setDeleteReason(""); setDeleteOpen(true); }}>Delete</Button>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        destructive
        title="Delete this content?"
        description="Permanent. Open reports for this item will be marked resolved."
        confirmLabel="Delete"
        loading={pending}
        confirmDisabled={deleteReason.trim().length < 3}
        onConfirm={() => {
          const reason = deleteReason.trim();
          setDeleteOpen(false);
          run(() => adminDeleteTarget(targetType, targetId, reason));
        }}
      >
        <Textarea
          label="Reason (audit log)"
          name="delete_reason_row"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Short reason…"
        />
      </ConfirmDialog>
    </>
  );
}

export function BanButton({ userId, banned, big }: { userId: string; banned: boolean; big?: boolean }) {
  const { pending, run } = useRun();
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  if (banned) return <Button size={big ? "md" : "sm"} variant="outline" loading={pending} onClick={() => run(() => adminSetBan(userId, false))}>Unban user</Button>;
  return (
    <>
      <Button size={big ? "md" : "sm"} variant={big ? "danger" : "danger-ghost"} loading={pending} onClick={() => { setReason(""); setConfirm(true); }}><Ban className="h-4 w-4" aria-hidden /> Ban user</Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        destructive
        title="Ban this user?"
        description="They won't be able to post, comment or contact anyone. You can unban them later."
        confirmLabel="Ban user"
        loading={pending}
        confirmDisabled={reason.trim().length < 3}
        onConfirm={() => {
          setConfirm(false);
          run(() => adminSetBan(userId, true, reason.trim()));
        }}
      >
        <Textarea
          label="Reason (saved in audit log)"
          name="ban_reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Repeated adoption scams, fake lost reports…"
        />
      </ConfirmDialog>
    </>
  );
}
