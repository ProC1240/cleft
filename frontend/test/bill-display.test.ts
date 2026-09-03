import { describe, expect, it } from "vitest";
import { computePayerAmounts, getUnassignedItemNames, sessionTotal } from "@/lib/bill-display";

describe("bill display calculations", () => {
  it("splits ALL and PARTIAL members per item", () => {
    const items = [
      { name: "Pizza", price: 300, quantity: 1 },
      { name: "Drink", price: 50, quantity: 2 },
    ];
    const members = [
      { name: "Alice", splitType: "ALL" as const, itemNames: [] },
      { name: "Bob", splitType: "PARTIAL" as const, itemNames: ["Pizza"] },
    ];

    expect(computePayerAmounts(items, members).map(({ name, amount }) => ({ name, amount }))).toEqual([
      { name: "Alice", amount: 250 },
      { name: "Bob", amount: 150 },
    ]);
    expect(sessionTotal(items)).toBe(400);
  });

  it("allocates rounding residue without losing a cent", () => {
    const result = computePayerAmounts(
      [{ name: "Shared dish", price: 100, quantity: 1 }],
      ["Alice", "Bob", "Cara"].map((name) => ({ name, splitType: "ALL" as const, itemNames: [] })),
    );

    expect(result.map((member) => member.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(result.reduce((sum, member) => sum + member.amount, 0)).toBe(100);
  });

  it("reports items that no member is responsible for", () => {
    expect(
      getUnassignedItemNames(
        [{ name: "Dessert", price: 120, quantity: 1 }],
        [{ name: "Alice", splitType: "PARTIAL", itemNames: [] }],
      ),
    ).toEqual(["Dessert"]);
  });
});
