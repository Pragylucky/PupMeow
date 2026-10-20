"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { markHealthDone } from "@/lib/actions/pets";
import { cn } from "@/lib/utils";

/** "Add to calendar": Google Calendar, or an .ics file for Apple Calendar / Outlook / any phone. */
export function AddToCalendar({ event, label = "Add to calendar", className, tone = "default" }: { event: CalendarEvent; label?: string; className?: string; tone?: "default" | "onColor" | "white" }) {
  const toast = useToast();
  return (
    <DropdownMenu
      label={label}
      align="start"
      className={className}
      triggerClassName={cn(
        "inline-flex h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] font-bold",
        tone === "onColor" ? "bg-ink text-white hover:bg-ink/90" : tone === "white" ? "bg-white text-ink hover:bg-cream" : "border-2 border-border bg-surface text-text hover:border-text",
      )}
      trigger={<><CalendarPlus className="h-[1.1rem] w-[1.1rem]" aria-hidden /> {label}</>}
      items={[
        { label: "Google Calendar", onSelect: () => window.open(googleCalendarUrl(event), "_blank", "noopener,noreferrer") },
        {
          label: "Apple / Outlook / other (.ics)",
          onSelect: () => {
            downloadIcs(event, `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.ics`);
            toast("Calendar file downloaded. Open it to add the reminder.", "info");
          },
        },
      ]}
    />
  );
}

/** Logs today's dose and schedules the next one. */
export function MarkGivenButton({ recordId, className, variant = "outline", size = "md", label = "Mark as given" }: { recordId: string; className?: string; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; label?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={pending}
      onClick={() => start(async () => {
        const r = await markHealthDone(recordId);
        toast(r.ok ? r.message ?? "Saved" : r.error, r.ok ? "success" : "error");
        if (r.ok) router.refresh();
      })}
    >
      {!pending && <Check className="h-[1.1rem] w-[1.1rem]" aria-hidden />} {label}
    </Button>
  );
}
