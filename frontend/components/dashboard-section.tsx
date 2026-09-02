"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, SectionLabel } from "@/components/ui/card";
import { usePartySession } from "@/hooks/use-party-session";
import { computePayerAmounts, formatMoney, sessionTotal } from "@/lib/bill-display";

const PIE_COLORS = ["#6D4DE6", "#8A6CF0", "#5636C9", "#A89EE0", "#7A5CE0", "#B8A8F8", "#49349D"];

export function DashboardSection() {
  const { session } = usePartySession();
  const total = sessionTotal(session.items);
  const payerData = computePayerAmounts(session.items, session.members);

  const chartData = session.items.map((item) => ({
    name: item.name,
    value: item.price * (item.quantity ?? 1),
  }));

  return (
    <section id="dashboard" className="scroll-mt-24 space-y-5 sm:space-y-6">
      <Card className="dashboard-card">
        <SectionLabel>Spending distribution</SectionLabel>
        <p className="stat-value mt-4">{total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>

        <ul className="mt-4 space-y-2">
          {session.items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 border-b border-white/[0.05] py-2 text-sm last:border-0">
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 tabular-nums text-num">— {formatMoney(item.price * (item.quantity ?? 1)).replace(" THB", "")}</span>
            </li>
          ))}
        </ul>

        {chartData.length > 0 ? (
          <div className="mt-6 h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="85%" innerRadius="45%">
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </Card>

      <Card className="dashboard-card">
        <SectionLabel>Who needs to pay</SectionLabel>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {payerData.map((payer) => (
            <div key={payer.name} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-surface/50 p-3">
              <span className="font-medium">{payer.name}</span>
              <span className="tabular-nums text-num">{payer.amount.toFixed(2)}</span>
            </div>
          ))}
          {payerData.length === 0 ? <p className="text-sm text-muted">Add members to see splits.</p> : null}
        </div>
      </Card>

      <Card className="dashboard-card">
        <SectionLabel>Distribution</SectionLabel>
        <div className="mt-4 space-y-3">
          {payerData.map((payer) => {
            const pct = total > 0 ? Math.round((payer.amount / total) * 100) : 0;
            return (
              <div key={payer.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{payer.name}</span>
                  <span className="tabular-nums text-num">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent transition-all duration-450 ease-smooth" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
