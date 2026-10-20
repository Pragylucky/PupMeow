import { PostSkeleton, Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-4" role="status" aria-label="Loading feed">
      <Skeleton className="h-10 w-64 rounded-full" />
      <Skeleton className="h-16 w-full rounded-[var(--radius-lg)]" />
      <div className="grid gap-4 lg:grid-cols-2"><PostSkeleton /><PostSkeleton /></div>
    </div>
  );
}
