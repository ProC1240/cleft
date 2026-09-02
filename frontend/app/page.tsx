"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { AppLogo } from "@/components/app-logo";
import { DashboardSection } from "@/components/dashboard-section";
import { Card, SectionLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartySession } from "@/hooks/use-party-session";
import { sessionTotal } from "@/lib/bill-display";
import { API_BASE } from "@/lib/api-base";
import { api } from "@/lib/axios";

type HistoryRecord = {
  id: string;
  party: { name: string; totalAmount: string; date: string };
};

function formatStatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatHistoryDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

export default function HomePage() {
  const [showAll, setShowAll] = useState(false);
  const { session } = usePartySession();

  const total = sessionTotal(session.items);
  const memberNames = session.members.map((m) => m.name).join(" · ");

  const { data: authSession, isLoading: isAuthLoading } = useQuery({
    queryKey: ["top-nav-session"],
    queryFn: async () => (await api.get<{ authenticated: boolean }>("/auth/session")).data,
    retry: 0,
  });
  const isAuthenticated = !!authSession?.authenticated;

  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => (await api.get<{ currencySymbol: string }>("/users/profile")).data,
    enabled: isAuthenticated,
  });

  const currencySymbol = currentProfile?.currencySymbol ?? "THB";

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["history", showAll],
    queryFn: async () => (await api.get<HistoryRecord[]>(`/party/history?all=${showAll}`)).data,
    enabled: isAuthenticated,
  });

  if (isAuthLoading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-stage">
        <div className="login-panel">
          <div className="login-panel__inner">
            <div className="mx-auto flex justify-center">
              <AppLogo size="lg" variant="square" showWordmark={false} />
            </div>
            <h1 className="font-display mt-6 text-[1.7rem] font-medium tracking-[0.005em] text-text">cleft</h1>
            <p className="mx-auto mt-3 max-w-[250px] text-[0.92rem] font-light leading-[1.65] text-muted">
              Split party bills fairly. Add items, assign members, confirm in one flow.
            </p>
            <div className="login-divider my-[2.1rem]" />
            <a
              href={`${API_BASE}/auth/google`}
              className="login-cta inline-flex w-full items-center justify-center gap-3 rounded-xl px-5 py-[0.9rem] text-[0.95rem] font-medium"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px] shrink-0">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
            <p className="mt-6 text-[0.78rem] font-light leading-6 text-[#6f6791]">
              Items, members, and summary unlock once you sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="new-bill-panel px-6 py-7 sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <SectionLabel>{session.items.length > 0 || session.members.length > 0 ? "Current bill" : "Ready when you are"}</SectionLabel>
            <h1 className="font-display mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-text sm:text-[2.35rem]">
              {session.items.length > 0 || session.members.length > 0 ? "Continue your bill" : "Start a new bill"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              {session.items.length > 0 || session.members.length > 0
                ? `${session.partyName || "Untitled party"} · ${session.items.length} items · ${session.members.length} members`
                : "Add every item, invite the group, then let cleft calculate each share."}
            </p>
            {memberNames ? <p className="mt-1 truncate text-xs text-[#6f6791]">{memberNames}</p> : null}
          </div>

          <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
            <div className="min-w-0 sm:text-right">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-[#6f6791]">Total</p>
              <p className="font-mono mt-1 text-xl font-medium tabular-nums text-text">
                {formatStatAmount(total)} <span className="text-xs font-normal text-muted">{currencySymbol}</span>
              </p>
            </div>
            <Link
              href="/items"
              className="btn-accent inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              {session.items.length > 0 || session.members.length > 0 ? "Continue" : "Create bill"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Card>

      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Recent history</SectionLabel>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-2xs font-medium text-muted hover:text-text"
          >
            {showAll ? "Show less" : "More"}
          </button>
        </div>
        <div className="bill-list mt-4">
          {isHistoryLoading ? (
            <>
              <Skeleton className="h-[76px] w-full rounded-2xl" />
              <Skeleton className="h-[76px] w-full rounded-2xl" />
              <Skeleton className="h-[76px] w-full rounded-2xl" />
            </>
          ) : history && history.length > 0 ? (
            history.slice(0, showAll ? history.length : 3).map((record) => (
              <div key={record.id} className="bill-card">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{record.party.name}</p>
                  <p className="font-mono mt-1 text-[0.68rem] uppercase tracking-[0.08em] text-[#6f6791]">
                    {formatHistoryDate(record.party.date)}
                  </p>
                </div>
                <p className="font-mono shrink-0 text-sm font-medium tabular-nums text-text">
                  {record.party.totalAmount} <span className="text-[0.65rem] font-normal text-muted">{currencySymbol}</span>
                </p>
              </div>
            ))
          ) : (
            <div className="bill-card">
              <div>
                <p className="font-medium text-text">No confirmed bills yet</p>
                <p className="mt-1 text-sm text-muted">Your completed splits will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <DashboardSection />
    </div>
  );
}
