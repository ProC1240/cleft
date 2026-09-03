import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { CalculatePartyDto } from "./dto/calculate-party.dto";
import { PartyService } from "./party.service";

const baseParty = {
  partyName: "Portfolio test",
  partyDate: "2026-09-03",
};

function createService() {
  return new PartyService({} as PrismaService);
}

describe("PartyService.calculate", () => {
  it("splits ALL and PARTIAL participants per item", () => {
    const dto: CalculatePartyDto = {
      ...baseParty,
      items: [
        { name: "Pizza", price: 300 },
        { name: "Drink", price: 100 },
      ],
      participants: [
        { name: "Alice", splitType: "ALL", itemNames: [] },
        { name: "Bob", splitType: "PARTIAL", itemNames: ["Pizza"] },
      ],
    };

    expect(createService().calculate(dto)).toMatchObject({
      totalAmount: 400,
      participants: [
        { name: "Alice", amount: 250 },
        { name: "Bob", amount: 150 },
      ],
    });
  });

  it("allocates rounding residue so participant totals equal the bill", () => {
    const dto: CalculatePartyDto = {
      ...baseParty,
      items: [{ name: "Shared dish", price: 100 }],
      participants: ["Alice", "Bob", "Cara"].map((name) => ({
        name,
        splitType: "ALL" as const,
        itemNames: [],
      })),
    };

    const result = createService().calculate(dto);
    expect(result.participants.map((participant) => participant.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(result.participants.reduce((sum, participant) => sum + participant.amount, 0)).toBe(100);
  });

  it("rejects a bill when an item has no participant", () => {
    const dto: CalculatePartyDto = {
      ...baseParty,
      items: [{ name: "Dessert", price: 120 }],
      participants: [{ name: "Alice", splitType: "PARTIAL", itemNames: [] }],
    };

    expect(() => createService().calculate(dto)).toThrow(BadRequestException);
  });

  it("rejects duplicate names after trimming and case normalization", () => {
    const dto: CalculatePartyDto = {
      ...baseParty,
      items: [
        { name: "Tea", price: 50 },
        { name: " tea ", price: 60 },
      ],
      participants: [{ name: "Alice", splitType: "ALL", itemNames: [] }],
    };

    expect(() => createService().calculate(dto)).toThrow("Item names must be non-empty and unique");
  });
});
