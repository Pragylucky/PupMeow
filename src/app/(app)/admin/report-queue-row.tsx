"use client";

import Link from "next/link";
import { EyeOff } from "lucide-react";
import { PetImage } from "@/components/brand/pet-image";
import { Badge } from "@/components/ui/badge";
import { moderationPreviewImage } from "@/lib/moderation/visibility";
import { cn, sinceLabel } from "@/lib/utils";
import { ReportRowActions } from "./admin-client";
import type { ReportTarget } from "@/types/database";

export type ReportQueuePreview = {
  title: string;
  hidden: boolean;
  image?: string;
  kindLabel: string;
  kindTone: string;
};

export function ReportQueueRow({
  href,
  active,
  reasons,
  reportCount,
  createdAt,
  ownerUsername,
  targetType,
  targetId,
  preview,
}: {
  href: string;
  active: boolean;
  reasons: string[];
  reportCount: number;
  createdAt: string;
  ownerUsername?: string | null;
  targetType: ReportTarget;
  targetId: string;
  preview?: ReportQueuePreview;
}) {
  const p = preview;
  const thumb = moderationPreviewImage(p ? { image: p.image, hidden: p.hidden } : undefined);

  return (
    <li className={cn("border-b border-border last:border-0", active && "bg-cream/60")}>
      <div className="grid items-center gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_120px_72px_64px_auto]">
        <Link href={href} scroll={false} className={cn("flex min-w-0 items-center gap-3 hover:opacity-90", active && "text-ink")}>
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] bg-surface-2">
              {thumb ? (
                <PetImage src={thumb} alt="" species="dog" sizes="48px" />
              ) : p?.hidden ? (
                <EyeOff className="h-5 w-5 text-muted" aria-hidden />
              ) : (
                <span className="text-xs font-extrabold text-muted">{p?.kindLabel ?? "—"}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{p?.title ?? "Deleted content"}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.8rem]">
                {p && <span className={cn("rounded-full px-2 py-0.5 font-extrabold", p.kindTone)}>{p.kindLabel}</span>}
                {ownerUsername && <span className="truncate text-muted">@{ownerUsername}</span>}
                {p?.hidden && <Badge tone="ink" className="px-2 py-0.5">Hidden</Badge>}
              </span>
            </span>
          </span>
        </Link>
        <span className="text-[0.9rem] font-semibold lg:block">
          <span className="text-muted lg:hidden">Reason: </span>
          {reasons.join(", ")}
        </span>
        <span className="font-heading text-lg font-semibold">
          <span className="text-sm font-sans font-bold text-muted lg:hidden">Reports: </span>
          {reportCount}
        </span>
        <span className="text-sm font-semibold text-muted">{sinceLabel(createdAt)}</span>
        <div className="flex justify-end">
          <ReportRowActions
            targetType={targetType}
            targetId={targetId}
            hidden={p?.hidden ?? false}
            contentExists={Boolean(p)}
          />
        </div>
      </div>
    </li>
  );
}
