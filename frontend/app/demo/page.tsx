import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PayerShareBar } from "@/components/payer-share-bar";
import { Card, SectionLabel } from "@/components/ui/card";
import { computePayerAmounts, formatMoney, sessionTotal } from "@/lib/bill-display";
import { BillItem, Member } from "@/lib/types";

const demoItems: BillItem[] = [
  { name: "Dinner set", price: 480, quantity: 2 },
  { name: "Dessert", price: 160, quantity: 1 },
  { name: "Drinks", price: 60, quantity: 2 },
];

const demoMembers: Member[] = [
  { name: "Mina", splitType: "ALL", itemNames: [] },
  { name: "Narin", splitType: "ALL", itemNames: [] },
];

export default function DemoPage() {
  const total = sessionTotal(demoItems);
  const payers = computePayerAmounts(demoItems, demoMembers);

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio preview"
        title="Demo bill"
        description="Explore a completed split without signing in or changing saved data."
      />

      <Card className="receipt-card px-5 py-6 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionLabel>Sample receipt</SectionLabel>
          <p className="font-mono text-lg font-medium tabular-nums text-text">{formatMoney(total)}</p>
        </div>
        <div className="mt-5">
          {demoItems.map((item) => (
            <div key={item.name} className="receipt-row flex items-center justify-between gap-4">
              <span className="text-text">
                {item.name} <span className="font-mono text-xs text-muted">x{item.quantity}</span>
              </span>
              <span className="font-mono text-sm tabular-nums text-text">
                {formatMoney(item.price * (item.quantity ?? 1))}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <section className="mt-8 space-y-3">
        <SectionLabel>Who pays what</SectionLabel>
        {payers.map((payer) => (
          <Card key={payer.name} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-text">{payer.name}</span>
                <span className="font-mono tabular-nums text-text">{formatMoney(payer.amount)}</span>
              </div>
              <PayerShareBar amount={payer.amount} total={total} name={payer.name} compact />
            </div>
          </Card>
        ))}
      </section>

      <div className="mt-8 flex justify-center">
        <Link href="/" className="btn-accent inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
