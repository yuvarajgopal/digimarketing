import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[120px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[280px] rounded-lg" />
        <Skeleton className="h-[280px] rounded-lg" />
      </div>
    </div>
  );
}
