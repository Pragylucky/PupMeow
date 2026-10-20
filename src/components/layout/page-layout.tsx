import { cn } from "@/lib/utils";

/** Main column plus an optional, useful right-hand column on wide screens (stacks below on phones). */
export function WithRail({ children, rail, className, railClassName }: { children: React.ReactNode; rail?: React.ReactNode; className?: string; railClassName?: string }) {
  if (!rail) return <div className={cn("mx-auto w-full max-w-4xl", className)}>{children}</div>;
  return (
    <div className={cn("mx-auto grid w-full max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_330px]", className)}>
      <div className="min-w-0">{children}</div>
      <aside className={cn("no-print min-w-0 space-y-4 xl:sticky xl:top-[5.5rem] xl:self-start", railClassName)}>{rail}</aside>
    </div>
  );
}

/** Narrow, centred column for forms and settings. */
export function NarrowPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-2xl", className)}>{children}</div>;
}

/** Page for a form: title, short help, the form on a white card, and optional tips on the side. */
export function FormPage({ title, description, children, rail, back }: { title: string; description?: React.ReactNode; children: React.ReactNode; rail?: React.ReactNode; back?: React.ReactNode }) {
  const body = (
    <div>
      {back && <div className="mb-3">{back}</div>}
      <h1 className="text-[2rem] font-semibold leading-tight sm:text-[2.4rem]">{title}</h1>
      {description && <div className="mt-1.5 max-w-2xl text-[0.98rem] text-muted text-pretty">{description}</div>}
      <div className="mt-5 rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">{children}</div>
    </div>
  );
  if (!rail) return <div className="mx-auto w-full max-w-3xl">{body}</div>;
  return <WithRail rail={rail}>{body}</WithRail>;
}
