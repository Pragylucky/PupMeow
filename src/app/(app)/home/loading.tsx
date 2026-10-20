import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" role="status" aria-label="Loading home">
      <div className="space-y-6">
        <Skeleton className="h-52 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-xl)]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />)}</div>
        <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-[var(--radius-lg)]" />)}</div>
      </div>
      <div className="hidden space-y-4 xl:block"><Skeleton className="h-56 rounded-[var(--radius-lg)]" /><Skeleton className="h-36 rounded-[var(--radius-lg)]" /></div>
    </div>
  );
}
