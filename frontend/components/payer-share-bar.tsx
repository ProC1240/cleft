"use client";

const SEGMENT_COLORS = ["#6D4DE6", "#8A6CF0", "#5636C9", "#A89EE0", "#7A5CE0", "#B8A8F8", "#49349D"];

export function payerSharePercent(amount: number, total: number) {
  if (total <= 0 || amount <= 0) return 0;
  return Math.min(100, (amount / total) * 100);
}

type PayerShareBarProps = {
  amount: number;
  total: number;
  name?: string;
  color?: string;
  compact?: boolean;
};

export function PayerShareBar({ amount, total, name, color, compact = false }: PayerShareBarProps) {
  const pct = payerSharePercent(amount, total);
  const pctLabel = Math.round(pct);

  return (
    <div className={compact ? "mt-1.5" : "mt-2"}>
      <div className="mb-1 flex items-center justify-between gap-2 text-2xs">
        <span className="text-muted">Share</span>
        <span className="tabular-nums font-semibold text-num">{pctLabel}%</span>
      </div>
      <div className={`overflow-hidden rounded-full bg-bg/80 ring-1 ring-border/50 ${compact ? "h-1.5" : "h-2"}`}>
        <div
          className="h-full rounded-full transition-all duration-450 ease-smooth"
          style={{
            width: `${pct}%`,
            background: color ? color : "linear-gradient(90deg, #5636C9, #8A6CF0)",
          }}
          role="progressbar"
          aria-valuenow={pctLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={name ? `${name} bill share ${pctLabel}%` : `Bill share ${pctLabel}%`}
        />
      </div>
    </div>
  );
}

type StackedShareBarProps = {
  segments: { name: string; amount: number }[];
  total: number;
};

export function StackedShareBar({ segments, total }: StackedShareBarProps) {
  if (total <= 0 || segments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full ring-1 ring-border/50">
        {segments.map((segment, index) => {
          const pct = payerSharePercent(segment.amount, total);
          if (pct <= 0) return null;
          return (
            <div
              key={segment.name}
              className="h-full transition-all duration-450 ease-smooth first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
              }}
              title={`${segment.name}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted">
        {segments.map((segment, index) => {
          const pct = Math.round(payerSharePercent(segment.amount, total));
          if (pct <= 0) return null;
          return (
            <span key={segment.name} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
              />
              {segment.name} {pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
