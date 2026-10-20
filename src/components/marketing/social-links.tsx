import { InstagramIcon } from "@/components/brand/instagram-icon";
import { cn } from "@/lib/utils";
import { INSTAGRAM_URL } from "@/lib/constants";

/** Icon-only link to our Instagram (accessible label, no long text). */
export function InstagramIconLink({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  if (!INSTAGRAM_URL) return null;
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text", className)}
      aria-label="Pupmeow on Instagram"
      title="Pupmeow on Instagram"
    >
      <InstagramIcon className={cn("h-5 w-5", iconClassName)} />
    </a>
  );
}
