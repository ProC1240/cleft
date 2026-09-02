"use client";

import { FormEvent, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { usePartySession } from "@/hooks/use-party-session";
import { formatMoney, sessionTotal } from "@/lib/bill-display";
import { Input } from "@/components/ui/input";

const emptyForm = { name: "", price: "", quantity: "1", note: "" };

export default function ItemsPage() {
  const { session, setSession } = usePartySession();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { showToast } = useToast();

  const resetForms = () => {
    setForm(emptyForm);
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const submitItem = (e: FormEvent) => {
    e.preventDefault();
    const normalizedName = form.name.trim();
    const normalizedPrice = Number(form.price);
    const normalizedQuantity = Math.max(1, Number(form.quantity));
    if (!normalizedName || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0 || !Number.isFinite(normalizedQuantity)) {
      showToast({ title: "Check item details", description: "Name, price, and quantity must be valid.", kind: "error" });
      return;
    }
    const duplicate = session.items.some(
      (item, index) => index !== editingIndex && item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
    );
    if (duplicate) {
      showToast({ title: "Item name already exists", description: "Use a unique name so partial splits stay accurate.", kind: "error" });
      return;
    }

    if (editingIndex === null) {
      setSession((prev) => ({
        ...prev,
        items: [...prev.items, { name: normalizedName, price: normalizedPrice, quantity: normalizedQuantity, note: form.note.trim() }],
      }));
      showToast({ title: "Item created", kind: "success" });
    } else {
      setSession((prev) => ({
        ...prev,
        items: prev.items.map((item, idx) =>
          idx === editingIndex ? { ...item, name: normalizedName, price: normalizedPrice, quantity: normalizedQuantity, note: form.note.trim() } : item,
        ),
        members: prev.members.map((member) => ({
          ...member,
          itemNames: (member.itemNames ?? []).map((name) =>
            name === prev.items[editingIndex].name ? normalizedName : name,
          ),
        })),
      }));
      showToast({ title: "Item updated", kind: "success" });
    }
    resetForms();
  };

  const startEdit = (idx: number) => {
    const target = session.items[idx];
    setForm({ name: target.name, price: String(target.price), quantity: String(target.quantity ?? 1), note: target.note ?? "" });
    setEditingIndex(idx);
    setShowAddForm(false);
  };

  const deleteItem = (idx: number) => {
    if (!window.confirm("Delete this item?")) return;
    setSession((prev) => {
      const removedName = prev.items[idx]?.name;
      return {
        ...prev,
        items: prev.items.filter((_, index) => index !== idx),
        members: prev.members.map((member) => ({
          ...member,
          itemNames: (member.itemNames ?? []).filter((name) => name !== removedName),
        })),
      };
    });
    if (editingIndex === idx) resetForms();
    showToast({ title: "Item deleted", kind: "success" });
  };

  return (
    <AuthGuard>
      <div>
        <PageHeader
          eyebrow={session.partyName || "Current bill"}
          title="Items"
          description="Build the receipt one line at a time. Quantities and notes stay attached to each item."
        />

        <section className="receipt-card px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <p className="font-display text-lg font-semibold text-text">Order receipt</p>
              <p className="font-mono mt-1 text-[0.66rem] uppercase tracking-[0.1em] text-[#6f6791]">{session.partyDate}</p>
            </div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">{session.items.length} items</p>
          </div>

          <div className="mt-4">
            {session.items.map((item, idx) => {
              const lineTotal = item.price * (item.quantity ?? 1);
              const isEditing = editingIndex === idx;

              if (isEditing) {
                return (
                  <div key={`${item.name}-${idx}`} className="receipt-row">
                    <form onSubmit={submitItem} className="grid gap-3 sm:grid-cols-2">
                      <Input aria-label="Item name" placeholder="Item name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
                      <Input aria-label="Item price" placeholder="Price" inputMode="decimal" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} required />
                      <Input aria-label="Item quantity" placeholder="Qty" type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} required />
                      <Input aria-label="Item note" placeholder="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <Button type="submit">Save</Button>
                        <Button type="button" variant="outline" onClick={resetForms}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div key={`${item.name}-${idx}`} className="receipt-row group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {item.name} <span className="font-mono ml-1 text-xs font-normal text-muted">×{item.quantity ?? 1}</span>
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6f6791]">{item.note || `${item.price.toFixed(2)} each`}</p>
                    </div>
                    <p className="font-mono shrink-0 text-sm tabular-nums text-text">{formatMoney(lineTotal).replace(" THB", "")}</p>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <Button type="button" variant="ghost" size="sm" className="px-0 py-1" onClick={() => startEdit(idx)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" size="sm" className="border-0 px-0 py-1" onClick={() => deleteItem(idx)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}

            {session.items.length === 0 && !showAddForm ? (
              <div className="py-9 text-center">
                <p className="font-display text-lg text-text">Your receipt is empty</p>
                <p className="mt-2 text-sm text-muted">Add the first item to begin the split.</p>
              </div>
            ) : null}
          </div>

          {showAddForm ? (
            <div className="receipt-row border-b-0 pt-4">
              <p className="font-mono mb-3 text-[0.68rem] uppercase tracking-[0.1em] text-muted">Add new item</p>
              <form onSubmit={submitItem} className="grid gap-3 sm:grid-cols-2">
                <Input aria-label="Item name" placeholder="Item name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
                <Input aria-label="Item price" placeholder="Price" inputMode="decimal" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} required />
                <Input aria-label="Item quantity" placeholder="Qty" type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} required />
                <Input aria-label="Item note" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button type="submit">Add item</Button>
                  <Button type="button" variant="outline" onClick={resetForms}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(emptyForm);
                  setEditingIndex(null);
                  setShowAddForm(true);
                }}
              >
                <span aria-hidden="true">＋</span> Add item
              </Button>
            </div>
          )}

          <div className="receipt-fold" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 text-muted">
              <span>Lines</span>
              <span className="font-mono tabular-nums">{session.items.length}</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <span className="font-display text-xl font-semibold text-text">Total</span>
              <span className="font-mono text-xl font-medium tabular-nums text-text">{formatMoney(sessionTotal(session.items))}</span>
            </div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
