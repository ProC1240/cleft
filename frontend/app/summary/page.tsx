"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { PayerShareBar, StackedShareBar } from "@/components/payer-share-bar";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/axios";
import { usePartySession } from "@/hooks/use-party-session";
import {
  computePayerAmounts,
  formatMoney,
  getUnassignedItemNames,
  memberInitial,
  sessionTotal,
  type PayerRow,
} from "@/lib/bill-display";

export default function SummaryPage() {
  const { session, setSession } = usePartySession();
  const router = useRouter();
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const { showToast } = useToast();

  const partyName = session.partyName.trim();

  const normalizedItems = session.items.map((item) => ({
    name: item.name,
    price: item.price * (item.quantity ?? 1),
    note: item.note ? `${item.note} (x${item.quantity ?? 1})` : `x${item.quantity ?? 1}`,
  }));

  const payers: PayerRow[] = computePayerAmounts(session.items, session.members);
  const total = sessionTotal(session.items);
  const unassignedItems = getUnassignedItemNames(session.items, session.members);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!partyName || session.items.length === 0 || session.members.length === 0 || unassignedItems.length > 0) {
        throw new Error("Party name, items, and members are required");
      }
      const payload = {
        party: {
          partyName,
          partyDate: session.partyDate,
          items: normalizedItems,
          participants: session.members,
        },
        confirmedAt: new Date().toISOString(),
      };
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (slipFile) formData.append("slip", slipFile);
      return (await api.post("/party/confirm", formData)).data;
    },
    onMutate: () => showToast({ title: "Confirming...", kind: "info" }),
    onSuccess: () => {
      showToast({ title: "Party saved", kind: "success" });
      setSession((prev) => ({
        partyName: prev.partyName.trim() || prev.partyName,
        partyDate: new Date().toISOString().slice(0, 10),
        items: [],
        members: [],
      }));
      setSlipFile(null);
      router.push("/");
    },
    onError: () => showToast({ title: "Confirm failed", description: "Upload or server error, please retry.", kind: "error" }),
  });

  const splitLabel = (payer: PayerRow) => {
    const member = session.members.find((m) => m.name === payer.name);
    if (member?.splitType === "PARTIAL") {
      const count = member.itemNames?.length ?? payer.itemCount ?? 0;
      return `Partial — ${count} item${count === 1 ? "" : "s"}`;
    }
    return "All items";
  };

  return (
    <AuthGuard>
      <div>
        <PageHeader
          eyebrow={partyName || "Final step"}
          title="Summary"
          description="Review every share, attach the payment slip if needed, then confirm the bill."
        />

        <section className="rounded-2xl border border-white/[0.07] bg-card p-5 sm:p-6">
          <label htmlFor="party-name" className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">
            Party name
          </label>
          <Input
            id="party-name"
            className="mt-3"
            placeholder="Enter party name"
            value={session.partyName}
            onChange={(e) => setSession((prev) => ({ ...prev, partyName: e.target.value }))}
          />

          {payers.length > 0 && total > 0 ? (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <div className="mb-3 flex items-end justify-between gap-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Bill split overview</p>
                <p className="font-mono text-sm tabular-nums text-text">{formatMoney(total)}</p>
              </div>
              <StackedShareBar segments={payers.map((p) => ({ name: p.name, amount: p.amount }))} total={total} />
            </div>
          ) : null}
        </section>

        {unassignedItems.length > 0 ? (
          <div role="alert" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Assign every item before confirming: {unassignedItems.join(", ")}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionLabel>Who pays what</SectionLabel>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-[#6f6791]">{payers.length} members</span>
          </div>
          <div className="ticket-list">
            {payers.map((payer, index) => (
              <div key={payer.name} className="ticket-stub">
                <div className="ticket-main">
                  <div className="flex items-center gap-3">
                    <span className="member-avatar h-9 w-9 text-[0.68rem]">{memberInitial(payer.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">
                        <span className="font-mono mr-2 text-[0.62rem] font-normal text-[#6f6791]">{String(index + 1).padStart(2, "0")}</span>
                        {payer.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{splitLabel(payer)}</p>
                    </div>
                  </div>
                  <PayerShareBar amount={payer.amount} total={total} name={payer.name} compact />
                </div>
                <div className="ticket-amount">{payer.amount.toFixed(2)}</div>
              </div>
            ))}
            {payers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
                <p className="font-display text-lg text-text">Nothing to split yet</p>
                <p className="mt-2 text-sm text-muted">Add items and members first.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="receipt-card mt-9 px-5 py-6 sm:px-6">
          <SectionLabel>Digital slip</SectionLabel>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Party</dt>
              <dd className="text-right font-medium text-text">{session.partyName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Date</dt>
              <dd className="font-mono text-right text-xs text-text">{session.partyDate}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Total items</dt>
              <dd className="font-mono tabular-nums text-num">{session.items.length}</dd>
            </div>
            <div className="receipt-fold" />
            <div>
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">Members</dt>
              <dd className="mt-3 space-y-2">
                {payers.map((payer) => (
                  <div key={payer.name} className="flex justify-between gap-4 tabular-nums">
                    <span className="text-text">{payer.name}</span>
                    <span className="font-mono text-text">{payer.amount.toFixed(2)}</span>
                  </div>
                ))}
              </dd>
            </div>
            <div className="receipt-fold" />
            <div className="flex items-end justify-between gap-4">
              <dt className="font-display text-xl font-semibold text-text">Total</dt>
              <dd className="font-mono text-xl font-medium tabular-nums text-text">{formatMoney(total)}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-dashed border-white/[0.12] pt-5">
            <Input aria-label="Upload payment slip" type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} />
            {slipFile ? <p className="mt-2 text-xs text-muted">Selected: {slipFile.name}</p> : null}
          </div>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/members"
            className="inline-flex items-center justify-center rounded-xl border border-accent/40 bg-surface px-4 py-2 text-center text-sm font-medium text-text transition-all duration-300 ease-smooth hover:border-accent/60 hover:bg-accent/10"
          >
            Back
          </Link>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={
              !partyName ||
              session.items.length === 0 ||
              session.members.length === 0 ||
              unassignedItems.length > 0 ||
              confirmMutation.isPending
            }
            className="flex-1 sm:flex-none"
          >
            Confirm split
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
