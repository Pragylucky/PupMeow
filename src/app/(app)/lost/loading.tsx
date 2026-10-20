import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_330px]" role="status" aria-label="Loading">
      <div className="space-y-4"><Skeleton className="h-48 w-full rounded-[var(--radius-xl)]" /><Skeleton className="h-11 w-80 rounded-full" /><CardGridSkeleton /></div>
      <div className="hidden space-y-4 xl:block"><Skeleton className="h-60 rounded-[var(--radius-lg)]" /></div>
    </div>
  );
}
