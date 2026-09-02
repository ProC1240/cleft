import { BillItem, Member } from "./types";

export type PayerRow = { name: string; amount: number; splitType: Member["splitType"]; itemCount?: number };

function itemLineTotal(items: BillItem[]) {
  return new Map(items.map((item) => [item.name, item.price * (item.quantity ?? 1)]));
}

/**
 * Per-item fair split:
 * - ALL members are assigned to every item.
 * - PARTIAL members are assigned only to checked/selected items.
 * - PARTIAL with no selected items owes 0 THB.
 * - Each item's cost divides equally among everyone assigned to that item.
 */
export function computePayerAmounts(items: BillItem[], members: Member[]): PayerRow[] {
  if (members.length === 0) return [];

  const itemTotals = itemLineTotal(items);
  const allMembers = members.filter((m) => m.splitType === "ALL");
  const amounts = new Map<string, number>(members.map((m) => [m.name, 0]));

  for (const item of items) {
    const total = itemTotals.get(item.name) ?? 0;
    if (total <= 0) continue;

    const assigned = new Set<string>();
    for (const m of allMembers) assigned.add(m.name);
    for (const m of members) {
      if (m.splitType === "PARTIAL" && (m.itemNames ?? []).includes(item.name)) {
        assigned.add(m.name);
      }
    }

    const assignees = [...assigned];
    if (assignees.length === 0) continue;

    const share = total / assignees.length;
    for (const name of assignees) {
      amounts.set(name, (amounts.get(name) ?? 0) + share);
    }
  }

  return members.map((member) => {
    const isEmptyPartial = member.splitType === "PARTIAL" && (member.itemNames ?? []).length === 0;
    const amount = isEmptyPartial ? 0 : amounts.get(member.name) ?? 0;
    return {
      name: member.name,
      amount: Number(amount.toFixed(2)),
      splitType: member.splitType,
      itemCount: member.splitType === "PARTIAL" ? member.itemNames?.length ?? 0 : undefined,
    };
  });
}

export function sessionTotal(items: BillItem[]) {
  return items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
}

export function formatMoney(amount: number, currency = "THB") {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function memberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
