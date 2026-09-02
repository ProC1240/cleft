import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, SplitType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CalculatePartyDto } from "./dto/calculate-party.dto";
import { ConfirmPartyDto } from "./dto/confirm-party.dto";

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  private validateParty(dto: CalculatePartyDto) {
    const itemNames = dto.items.map((item) => item.name.trim().toLocaleLowerCase());
    const participantNames = dto.participants.map((participant) => participant.name.trim().toLocaleLowerCase());
    if (itemNames.some((name) => !name) || new Set(itemNames).size !== itemNames.length) {
      throw new BadRequestException("Item names must be non-empty and unique");
    }
    if (participantNames.some((name) => !name) || new Set(participantNames).size !== participantNames.length) {
      throw new BadRequestException("Participant names must be non-empty and unique");
    }

    const knownItems = new Set(dto.items.map((item) => item.name));
    const hasUnknownSelection = dto.participants.some((participant) =>
      (participant.itemNames ?? []).some((itemName) => !knownItems.has(itemName)),
    );
    if (hasUnknownSelection) throw new BadRequestException("A participant selected an unknown item");
  }

  calculate(dto: CalculatePartyDto) {
    this.validateParty(dto);
    const allItemsTotal = dto.items.reduce((sum, item) => sum + item.price, 0);
    const allParticipants = dto.participants.filter((p) => p.splitType === "ALL");
    const partialParticipants = dto.participants.filter((p) => p.splitType === "PARTIAL");
    const amounts = new Map<string, number>(dto.participants.map((p) => [p.name, 0]));

    for (const item of dto.items) {
      const assigned = new Set<string>();
      for (const p of allParticipants) assigned.add(p.name);
      for (const p of partialParticipants) {
        if ((p.itemNames ?? []).includes(item.name)) assigned.add(p.name);
      }

      let assignees = [...assigned];
      if (assignees.length === 0) continue;

      const share = item.price / assignees.length;
      for (const name of assignees) {
        amounts.set(name, (amounts.get(name) ?? 0) + share);
      }
    }

    const totals = dto.participants.map((participant) => {
      const isEmptyPartial =
        participant.splitType === "PARTIAL" && (participant.itemNames ?? []).length === 0;
      const amount = isEmptyPartial ? 0 : amounts.get(participant.name) ?? 0;
      return { name: participant.name, amount: Number(amount.toFixed(2)) };
    });

    return {
      partyName: dto.partyName,
      partyDate: dto.partyDate,
      totalAmount: Number(allItemsTotal.toFixed(2)),
      participants: totals,
      meta: {
        allCount: allParticipants.length,
        partialCount: partialParticipants.length,
      },
    };
  }

  async getHistory(userId: string, all = false) {
    return this.prisma.history.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: all ? undefined : 3,
      include: { party: { include: { items: true, participants: true } } },
    });
  }

  async confirm(userId: string, dto: ConfirmPartyDto, slipUrl?: string) {
    this.validateParty(dto.party);
    const totalAmount = dto.party.items.reduce((sum, i) => sum + i.price, 0);

    return this.prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          name: dto.party.partyName.trim(),
          date: new Date(dto.party.partyDate),
          totalAmount: new Prisma.Decimal(totalAmount),
          slipUrl: slipUrl ?? dto.slipUrl,
          items: {
            create: dto.party.items.map((item) => ({
              name: item.name.trim(),
              price: new Prisma.Decimal(item.price),
              note: item.note,
            })),
          },
          participants: {
            create: dto.party.participants.map((participant) => ({
              name: participant.name.trim(),
              splitType: participant.splitType as SplitType,
            })),
          },
        },
        include: { items: true, participants: true },
      });

      for (const participant of dto.party.participants) {
        if (participant.splitType !== "PARTIAL") continue;
        const createdParticipant = party.participants.find((p) => p.name === participant.name.trim());
        if (!createdParticipant) continue;
        for (const itemName of participant.itemNames ?? []) {
          const matchedItem = party.items.find((i) => i.name === itemName.trim());
          if (!matchedItem) continue;
          await tx.consumption.create({
            data: { participantId: createdParticipant.id, itemId: matchedItem.id },
          });
        }
      }

      await tx.history.create({
        data: {
          userId,
          partyId: party.id,
        },
      });

      return party;
    });
  }
}
