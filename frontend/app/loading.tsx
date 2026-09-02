import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Card>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-10 w-48" />
        <Skeleton className="mt-3 h-5 w-24" />
      </Card>
      <Card>
        <Skeleton className="h-4 w-36" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    </div>
  );
}
