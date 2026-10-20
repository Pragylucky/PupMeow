"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye, Check, Ban, RotateCcw } from "lucide-react";
import { adminSetHidden, adminSetBan, adminResolveReport } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

export function ReportActions({ reportIds, status, targetType, targetId, hidden, ownerId, ownerBanned }: { reportIds: string[]; status: ReportStatus; targetType: ReportTarget; targetId: string; hidden: boolean; ownerId: string | null; ownerBanned: boolean }) {
  const { pending, run } = useRun();
  const label = targetType === "post" ? "post" : targetType === "comment" ? "comment" : targetType === "lost_found" ? "report" : targetType === "adoption" ? "listing" : "profile";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {targetType !== "profile" && (hidden
          ? <Button variant="outline" disabled={pending} onClick={() => run(() => adminSetHidden(targetType, targetId, false))}><Eye className="h-4 w-4" aria-hidden /> Restore {label}</Button>
          : <Button disabled={pending} onClick={() => run(async () => { const r = await adminSetHidden(targetType, targetId, true); if (r.ok) await resolveAll(reportIds, "resolved"); return r.ok ? { ok: true, message: `Hidden. ${reportIds.length} report${reportIds.length === 1 ? "" : "s"} resolved.` } : r; })}><EyeOff className="h-4 w-4" aria-hidden /> Hide {label}</Button>)}
        {ownerId && <BanButton userId={ownerId} banned={ownerBanned} big />}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {status === "open" ? (
          <>
            <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "resolved"))}><Check className="h-4 w-4" aria-hidden /> Mark resolved</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "dismissed"))}>Dismiss</Button>
          </>
        ) : <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveAll(reportIds, "open"))}><RotateCcw className="h-4 w-4" aria-hidden /> Reopen</Button>}
      </div>
    </div>
  );
}

export function BanButton({ userId, banned, big }: { userId: string; banned: boolean; big?: boolean }) {
  const { pending, run } = useRun();
  const [confirm, setConfirm] = useState(false);
  if (banned) return <Button size={big ? "md" : "sm"} variant="outline" loading={pending} onClick={() => run(() => adminSetBan(userId, false))}>Unban user</Button>;
  return (
    <>
      <Button size={big ? "md" : "sm"} variant={big ? "danger" : "danger-ghost"} loading={pending} onClick={() => setConfirm(true)}><Ban className="h-4 w-4" aria-hidden /> Ban user</Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        destructive
        title="Ban this user?"
        description="They won't be able to post, comment or contact anyone. You can unban them later."
        confirmLabel="Ban user"
        loading={pending}
        onConfirm={() => { setConfirm(false); run(() => adminSetBan(userId, true)); }}
      />
    </>
  );
}
