"use client";

import { useActionState, useEffect } from "react";
import { submitReport } from "@/lib/actions/reports";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASONS } from "@/lib/constants";
import type { ReportTarget } from "@/types/database";
import type { ActionResult } from "@/types/models";

const LABELS: Record<ReportTarget, string> = {
  post: "post", comment: "comment", profile: "profile", lost_found: "lost & found report", adoption: "adoption listing", match_profile: "match profile",
};

export function ReportDialog({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: ReportTarget; targetId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReport, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Report sent");
      onClose();
    }
  }, [state, toast, onClose]);
  return (
    <Modal open={open} onClose={onClose} title={`Report this ${LABELS[targetType]}`} description="Reports are anonymous. Our moderators review every one.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <RadioGroup name="reason" legend="What's wrong?" columns={2} options={REPORT_REASONS.map((r) => ({ value: r.value, label: r.label }))} error={state && !state.ok ? state.fieldErrors?.reason : undefined} />
        <Textarea label="Details (optional)" name="details" maxLength={500} rows={3} placeholder="Anything that helps us understand" />
        {state && !state.ok && !state.fieldErrors && <p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={pending}>Send report</Button>
        </div>
      </form>
    </Modal>
  );
}
