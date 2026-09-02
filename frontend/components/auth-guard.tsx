"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "@/lib/axios";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isError } = useQuery({
    queryKey: ["session-check"],
    queryFn: async () => (await api.get("/auth/session")).data,
    retry: 0,
  });

  useEffect(() => {
    if (isError) router.replace("/");
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) return null;
  return <>{children}</>;
}
