"use client";

import { useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePartySession } from "@/hooks/use-party-session";
import { computePayerAmounts, formatMoney, memberInitial } from "@/lib/bill-display";
import { Member, SplitType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function MembersPage() {
  const { session, setSession } = usePartySession();
  const [name, setName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { showToast } = useToast();

  const payerData = useMemo(
    () => computePayerAmounts(session.items, session.members),
    [session.items, session.members],
  );
  const payerAmounts = useMemo(() => new Map(payerData.map((payer) => [payer.name, payer.amount])), [payerData]);

  const toggleEdit = (index: number) => {
    setEditingIndex((prev) => (prev === index ? null : index));
  };

  const updateMemberAt = (index: number, patch: Partial<Member>) => {
    setSession((prev) => ({
      ...prev,
      members: prev.members.map((m, i) => {
        if (i !== index) return m;
        const next: Member = { ...m, ...patch };
        if (patch.splitType === "ALL") next.itemNames = [];
        if (next.splitType === "PARTIAL" && !next.itemNames) next.itemNames = [];
        return next;
      }),
    }));
  };

  const setSplitType = (index: number, splitType: SplitType) => {
    updateMemberAt(index, { splitType, itemNames: splitType === "ALL" ? [] : session.members[index].itemNames ?? [] });
  };

  const toggleItemForMember = (index: number, itemName: string) => {
    const member = session.members[index];
    const current = member.itemNames ?? [];
    const next = current.includes(itemName) ? current.filter((n) => n !== itemName) : [...current, itemName];
    updateMemberAt(index, { itemNames: next });
  };

  const deleteMember = (index: number) => {
    if (!window.confirm(`Remove ${session.members[index].name}?`)) return;
    setSession((prev) => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && index < editingIndex) setEditingIndex(editingIndex - 1);
  };

  const addMember = () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    if (session.members.some((member) => member.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      showToast({ title: "Member already exists", description: "Use a unique name so each share stays separate.", kind: "error" });
      return;
    }
    setSession((prev) => ({
      ...prev,
      members: [...prev.members, { name: normalizedName, splitType: "ALL", itemNames: [] }],
    }));
    setName("");
  };

  const updateMemberName = (index: number, nextName: string) => {
    const duplicate = session.members.some(
      (member, memberIndex) =>
        memberIndex !== index && member.name.toLocaleLowerCase() === nextName.trim().toLocaleLowerCase(),
    );
    if (nextName.trim() && duplicate) {
      showToast({ title: "Member already exists", description: "Each member needs a unique name.", kind: "error" });
      return;
    }
    updateMemberAt(index, { name: nextName });
  };

  return (
    <AuthGuard>
      <div>
        <PageHeader
          eyebrow={session.partyName || "Current bill"}
          title="Members"
          description="Add everyone at the table, then choose whether each person shares all items or only selected ones."
        />

        <div className="space-y-3">
          {session.members.map((member, idx) => {
            const isEditing = editingIndex === idx;
            const rowAmount = payerAmounts.get(member.name) ?? 0;

            return (
              <section key={idx} className={`member-card ${isEditing ? "member-card--open" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="member-avatar">
                      {memberInitial(member.name)}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleEdit(idx)}
                      className="min-w-0 truncate text-left font-medium text-text transition-colors hover:text-white"
                      aria-expanded={isEditing}
                    >
                      {member.name}
                      <span className="mt-1 block text-[0.7rem] font-normal text-[#6f6791]">
                        {member.splitType === "ALL" ? "Sharing all items" : `${member.itemNames?.length ?? 0} selected items`}
                      </span>
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden rounded-full border border-border px-2.5 py-1 text-2xs uppercase tracking-wide text-muted sm:inline-flex">
                      {member.splitType === "ALL" ? "All" : "Partial"}
                    </span>
                    <span className="font-mono min-w-[72px] text-right text-sm tabular-nums text-text">
                      {rowAmount.toFixed(2)}
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => toggleEdit(idx)} aria-label={`Edit ${member.name}`}>
                      {isEditing ? "Close" : "Edit"}
                    </Button>
                  </div>
                </div>

                <div
                  className={`member-edit-panel ${isEditing ? "member-edit-panel--open" : "pointer-events-none"}`}
                  aria-hidden={!isEditing}
                >
                  <div className="member-edit-panel__inner space-y-4">
                    <Input
                      aria-label={`Name for ${member.name || "member"}`}
                      placeholder="Member name"
                      value={member.name}
                      onChange={(e) => updateMemberName(idx, e.target.value)}
                      onBlur={(e) => {
                        const trimmed = e.target.value.trim();
                        if (trimmed) updateMemberName(idx, trimmed);
                      }}
                      tabIndex={isEditing ? 0 : -1}
                    />
                    <div className="flex rounded-full border border-border bg-bg/40 p-1">
                      <button
                        type="button"
                        onClick={() => setSplitType(idx, "ALL")}
                        tabIndex={isEditing ? 0 : -1}
                        className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-smooth ${
                          member.splitType === "ALL" ? "bg-accent text-white" : "text-muted hover:text-text"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitType(idx, "PARTIAL")}
                        tabIndex={isEditing ? 0 : -1}
                        className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ease-smooth ${
                          member.splitType === "PARTIAL" ? "bg-accent text-white" : "text-muted hover:text-text"
                        }`}
                      >
                        Partial
                      </button>
                    </div>

                    {member.splitType === "PARTIAL" ? (
                      <div className="space-y-2">
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted">Select items for {member.name || "member"}</p>
                        {session.items.map((item) => {
                          const lineTotal = item.price * (item.quantity ?? 1);
                          const checked = (member.itemNames ?? []).includes(item.name);
                          return (
                            <label
                              key={item.name}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200 ${
                                checked ? "border-accent/40 bg-accent/10" : "border-border bg-surface/40 hover:bg-surface/70"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleItemForMember(idx, item.name)}
                                  tabIndex={isEditing ? 0 : -1}
                                  className="accent-accent"
                                />
                                <span className="text-text">{item.name}</span>
                              </div>
                              <span className="shrink-0 tabular-nums text-sm text-num">{formatMoney(lineTotal)}</span>
                            </label>
                          );
                        })}
                        {session.items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Add items before choosing a partial split.</p> : null}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button type="button" variant="danger" size="sm" onClick={() => deleteMember(idx)}>
                        Remove member
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {session.members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-9 text-center">
              <p className="font-display text-lg text-text">No one at the table yet</p>
              <p className="mt-2 text-sm text-muted">Add the first member below.</p>
            </div>
          ) : null}
        </div>

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-card p-4 sm:p-5">
          <p className="font-mono mb-3 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Add someone</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input aria-label="New member name" placeholder="New member name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button type="button" onClick={addMember} className="shrink-0">
              Add member
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">Partial members can choose which items they share. Unchecked items count as 0 THB.</p>
        </section>
      </div>
    </AuthGuard>
  );
}
