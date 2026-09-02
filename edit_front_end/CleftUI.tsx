/**
 * cleft — standalone UI file for design review.
 * Mirrors production layout/styling with mock data only (no auth, no API).
 */

import {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type SplitType = "ALL" | "PARTIAL";
type BillItem = { name: string; price: number; quantity: number; note?: string };
type Member = { name: string; splitType: SplitType; itemNames?: string[] };
type PartySession = { partyName: string; partyDate: string; items: BillItem[]; members: Member[] };
type HistoryRecord = { id: string; party: { name: string; totalAmount: string; date: string } };
type AppView = "Home" | "Items" | "Members" | "Summary";
type NavLabel = "Home" | "Items" | "Members" | "Summary";
type ToastKind = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; kind?: ToastKind };
type ToastItem = ToastInput & { id: number; kind: ToastKind };
type PayerRow = { name: string; amount: number; splitType: SplitType; itemCount?: number };

const MOCK_HISTORY: HistoryRecord[] = [
  { id: "1", party: { name: "Friday Chill Party", totalAmount: "1,240.00 THB", date: "2026-06-06" } },
  { id: "2", party: { name: "Birthday Dinner", totalAmount: "3,850.00 THB", date: "2026-05-28" } },
  { id: "3", party: { name: "Office Happy Hour", totalAmount: "980.00 THB", date: "2026-05-15" } },
];

const INITIAL_SESSION: PartySession = {
  partyName: "Friday Chill Party",
  partyDate: "2026-06-11",
  items: [
    { name: "Craft IPA", price: 180, quantity: 4, note: "Happy hour" },
    { name: "Whiskey Sour", price: 220, quantity: 2 },
    { name: "Nachos Platter", price: 320, quantity: 1, note: "Shared" },
    { name: "Mojito", price: 190, quantity: 3 },
  ],
  members: [
    { name: "Alex", splitType: "ALL" },
    { name: "Jordan", splitType: "ALL" },
    { name: "Sam", splitType: "PARTIAL", itemNames: ["Craft IPA", "Nachos Platter"] },
  ],
};

const PIE_COLORS = ["#6327FF", "#7C4DFF", "#8B5CF6", "#A78BFA", "#4A1DBF", "#42D6C4", "#38BDF8"];
const NAV_LINKS: NavLabel[] = ["Home", "Items", "Members", "Summary"];
const emptyForm = { name: "", price: "", quantity: "1", note: "" };

function sessionTotal(items: BillItem[]) {
  return items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0);
}

function formatMoney(amount: number, currency = "THB") {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function memberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function computePayerAmounts(items: BillItem[], members: Member[]): PayerRow[] {
  if (members.length === 0) return [];

  const itemTotals = new Map(items.map((item) => [item.name, item.price * (item.quantity ?? 1)]));
  const allMembers = members.filter((m) => m.splitType === "ALL");
  const amounts = new Map<string, number>(members.map((m) => [m.name, 0]));

  for (const item of items) {
    const total = itemTotals.get(item.name) ?? 0;
    if (total <= 0) continue;

    const assigned = new Set<string>();
    for (const m of allMembers) assigned.add(m.name);
    for (const m of members) {
      if (m.splitType === "PARTIAL" && (m.itemNames ?? []).includes(item.name)) assigned.add(m.name);
    }

    const assignees = [...assigned];
    if (assignees.length === 0) continue;

    const share = total / assignees.length;
    for (const name of assignees) amounts.set(name, (amounts.get(name) ?? 0) + share);
  }

  return members.map((member) => {
    const isEmptyPartial = member.splitType === "PARTIAL" && (member.itemNames ?? []).length === 0;
    const amount = isEmptyPartial ? 0 : amounts.get(member.name) ?? 0;
    return {
      name: member.name,
      amount: Number(amount.toFixed(2)),
      splitType: member.splitType,
      itemCount: member.splitType === "PARTIAL" ? member.itemNames?.length : undefined,
    };
  });
}

function Button({ className = "", variant = "default", size = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "danger"; size?: "default" | "sm" }) {
  const base = "inline-flex items-center justify-center font-medium transition-all duration-300 ease-smooth active:scale-[0.98]";
  const sizes = size === "sm" ? "rounded-lg px-3 py-1.5 text-xs" : "rounded-full px-5 py-2.5 text-sm";
  const style =
    variant === "outline"
      ? "rounded-xl border border-border bg-surface text-text hover:border-accent/50"
      : variant === "ghost"
        ? "rounded-lg text-muted hover:bg-surface hover:text-text"
        : variant === "danger"
          ? "rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
          : "btn-accent";
  return <button className={`${base} ${sizes} ${style} ${className}`} {...props} />;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-2xl p-5 sm:p-6 ${className}`}>{children}</section>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function Input({ className = "", type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const fileStyles =
    "file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:brightness-110";
  return (
    <input
      type={type}
      className={`w-full min-w-0 rounded-xl border border-border bg-surface p-3 text-sm text-text outline-none transition-colors duration-300 ease-smooth placeholder:text-muted focus:border-accent ${type === "file" ? fileStyles : ""} ${className}`}
      {...props}
    />
  );
}

const ToastContext = createContext<{ showToast: (input: ToastInput) => void } | null>(null);

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: ToastItem = { id, kind: input.kind ?? "info", title: input.title, description: input.description };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={useMemo(() => ({ showToast }), [showToast])}>
      {children}
      <div className="pointer-events-none fixed right-3 top-[5.5rem] z-[100] space-y-2 sm:right-4 sm:top-20">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto toast-enter w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border p-3 shadow-soft ${toast.kind === "success" ? "border-emerald-400/60 bg-[#06261d]" : toast.kind === "error" ? "border-red-400/60 bg-[#2a0b11]" : "border-accent/60 bg-surface"}`}>
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-xs text-slate-200">{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function payerSharePercent(amount: number, total: number) {
  if (total <= 0 || amount <= 0) return 0;
  return Math.min(100, (amount / total) * 100);
}

function PayerShareBar({ amount, total, name }: { amount: number; total: number; name?: string }) {
  const pct = payerSharePercent(amount, total);
  const pctLabel = Math.round(pct);
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-2xs">
        <span className="text-muted">Share</span>
        <span className="tabular-nums font-semibold text-num">{pctLabel}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg/80 ring-1 ring-border/50">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#8B5CF6] transition-all duration-450 ease-smooth" style={{ width: `${pct}%` }} aria-label={name ? `${name} bill share ${pctLabel}%` : undefined} />
      </div>
    </div>
  );
}

function StackedShareBar({ segments, total }: { segments: { name: string; amount: number }[]; total: number }) {
  if (total <= 0 || segments.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full ring-1 ring-border/50">
        {segments.map((segment, index) => {
          const pct = payerSharePercent(segment.amount, total);
          if (pct <= 0) return null;
          return <div key={segment.name} className="h-full transition-all duration-450 ease-smooth" style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} title={`${segment.name}: ${Math.round(pct)}%`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-muted">
        {segments.map((segment, index) => {
          const pct = Math.round(payerSharePercent(segment.amount, total));
          if (pct <= 0) return null;
          return (
            <span key={segment.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              {segment.name} {pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AppLogoMark({ showWordmark = true, className = "" }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
      {showWordmark ? <span className="bg-gradient-to-r from-white via-[#e9ddff] to-[#a78bfa] bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">cleft</span> : null}
    </span>
  );
}

function TopNav({
  activeView,
  onNav,
  isAuthenticated,
  onToggleAuth,
}: {
  activeView: AppView;
  onNav: (label: NavLabel) => void;
  isAuthenticated: boolean;
  onToggleAuth: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-[#08051a]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <button type="button" onClick={() => onNav("Home")} className="shrink-0">
            <AppLogoMark showWordmark={false} />
          </button>
          <button type="button" onClick={() => onNav("Home")} className="min-w-0 flex-1 truncate text-right bg-gradient-to-r from-white via-[#e9ddff] to-[#a78bfa] bg-clip-text text-xl font-extrabold tracking-tight text-transparent drop-shadow-[0_0_14px_rgba(99,39,255,0.35)]">
            cleft
          </button>
          <ProfileMenu isAuthenticated={isAuthenticated} onToggleAuth={onToggleAuth} />
        </div>
        <div className="mt-2 sm:mt-0 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
          <button type="button" onClick={() => onNav("Home")} className="hidden shrink-0 text-left sm:inline-flex">
            <AppLogoMark />
          </button>
          <nav className="nav-scroll flex items-center gap-1 overflow-x-auto sm:justify-center">
            {NAV_LINKS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onNav(label)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-all duration-300 ease-smooth sm:px-4 ${activeView === label ? "bg-accent font-medium text-white shadow-glow" : "text-muted hover:text-text"}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="hidden shrink-0 justify-self-end sm:flex">
            <ProfileMenu isAuthenticated={isAuthenticated} onToggleAuth={onToggleAuth} />
          </div>
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({ isAuthenticated, onToggleAuth }: { isAuthenticated: boolean; onToggleAuth: () => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "Alex Chen", avatar: "", currencySymbol: "THB" });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setForm((p) => ({ ...p, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5 transition-all duration-300 ease-smooth hover:border-accent/50 sm:px-3" aria-expanded={open}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-accent/25 text-sm font-bold text-white">
          {form.avatar ? <img src={form.avatar} alt="" className="h-full w-full object-cover" /> : memberInitial(form.username)}
        </div>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-text sm:inline">{isAuthenticated ? form.username : "Guest"}</span>
      </button>
      {open ? (
        <div className="toast-enter absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold text-text">Profile</p>
          {isAuthenticated ? (
            <form onSubmit={(e) => { e.preventDefault(); showToast({ title: "Profile updated", kind: "success" }); setOpen(false); }} className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-accent/25 text-lg font-bold text-white">
                  {form.avatar ? <img src={form.avatar} alt="" className="h-full w-full object-cover" /> : memberInitial(form.username)}
                </div>
                <label className="flex-1 cursor-pointer">
                  <span className="text-xs text-muted">Avatar</span>
                  <Input type="file" accept="image/*" className="mt-1" onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="Username" />
              <Input value={form.currencySymbol} onChange={(e) => setForm((p) => ({ ...p, currencySymbol: e.target.value }))} placeholder="THB" />
              <Button type="submit" className="w-full">Save profile</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => { onToggleAuth(); setOpen(false); showToast({ title: "Logged out", kind: "success" }); }}>Logout</Button>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted">Login to edit your profile and sync party history.</p>
              <Button type="button" className="w-full" onClick={() => { onToggleAuth(); showToast({ title: "Logged in", kind: "success" }); }}>Login with Google</Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function HomeView({ session, isAuthenticated }: { session: PartySession; isAuthenticated: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const total = sessionTotal(session.items);
  const memberNames = session.members.map((m) => m.name).join(" · ");

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg space-y-6 pt-4 sm:pt-8">
        <Card className="px-6 py-10 text-center">
          <div className="mx-auto flex justify-center">
            <AppLogoMark className="flex-col gap-3 sm:flex-row" />
          </div>
          <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted">Split party bills fairly — add items, assign members, and confirm in one flow.</p>
          <Button type="button" className="mt-8 w-full sm:min-w-[220px] sm:w-auto">Login with Google</Button>
          <p className="mt-4 text-2xs text-muted">Items, Members, and Summary unlock after login.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionLabel>Current session</SectionLabel>
          <p className="stat-value mt-4">{total.toLocaleString("en-US")}</p>
          <p className="mt-2 text-sm text-muted">THB · <span className="text-num">{session.items.length}</span> items</p>
        </Card>
        <Card>
          <SectionLabel>Members</SectionLabel>
          <p className="stat-value mt-4">{session.members.length}</p>
          <p className="mt-2 truncate text-sm text-muted">{memberNames}</p>
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Recent history</SectionLabel>
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-2xs font-medium text-muted hover:text-text">{showAll ? "Show less" : "More"}</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MOCK_HISTORY.slice(0, showAll ? MOCK_HISTORY.length : 3).map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-surface/60 p-4">
              <p className="font-medium text-text">{r.party.name}</p>
              <p className="mt-2 text-sm tabular-nums text-num">{r.party.totalAmount}</p>
            </div>
          ))}
        </div>
      </Card>
      <div id="dashboard" className="scroll-mt-24">
        <DashboardView session={session} />
      </div>
    </div>
  );
}

function DashboardView({ session }: { session: PartySession }) {
  const total = sessionTotal(session.items);
  const payerData = computePayerAmounts(session.items, session.members);
  const chartData = session.items.map((item) => ({ name: item.name, value: item.price * (item.quantity ?? 1) }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card>
        <SectionLabel>Spending distribution</SectionLabel>
        <p className="stat-value mt-3 sm:mt-4">{total.toLocaleString("en-US")}</p>
        <ul className="mt-4 space-y-2">
          {session.items.map((item) => (
            <li key={item.name} className="flex justify-between gap-2 text-sm">
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 tabular-nums text-num">— {formatMoney(item.price * (item.quantity ?? 1)).replace(" THB", "")}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="85%" innerRadius="45%">
                {chartData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <SectionLabel>Who needs to pay</SectionLabel>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {payerData.map((p) => (
            <div key={p.name} className="flex justify-between rounded-xl border border-border bg-surface/60 p-3">
              <span className="font-medium">{p.name}</span>
              <span className="tabular-nums text-num">{p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionLabel>Distribution</SectionLabel>
        <div className="mt-4 space-y-3">
          {payerData.map((p) => {
            const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
            return (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-sm"><span>{p.name}</span><span className="tabular-nums text-num">{pct}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-accent transition-all duration-450 ease-smooth" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ItemsView({ session, setSession }: { session: PartySession; setSession: React.Dispatch<React.SetStateAction<PartySession>> }) {
  const { showToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const resetForms = () => { setForm(emptyForm); setEditingIndex(null); setShowAddForm(false); };

  const submitItem = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.quantity) return;
    const qty = Math.max(1, Number(form.quantity));
    if (editingIndex === null) {
      setSession((p) => ({ ...p, items: [...p.items, { name: form.name, price: Number(form.price), quantity: qty, note: form.note }] }));
      showToast({ title: "Item created", kind: "success" });
    } else {
      setSession((p) => ({ ...p, items: p.items.map((it, i) => i === editingIndex ? { ...it, name: form.name, price: Number(form.price), quantity: qty, note: form.note } : it) }));
      showToast({ title: "Item updated", kind: "success" });
    }
    resetForms();
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3">
        {session.items.map((item, idx) => {
          const lineTotal = item.price * (item.quantity ?? 1);
          if (editingIndex === idx) {
            return (
              <Card key={`${item.name}-${idx}`} className="border-accent/30">
                <form onSubmit={submitItem} className="grid gap-3 sm:grid-cols-4">
                  <Input placeholder="Item name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
                  <Input placeholder="Price" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} required />
                  <Input placeholder="Qty" type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} required />
                  <Input placeholder="Note" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} />
                  <div className="flex flex-wrap gap-2 sm:col-span-4"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={resetForms}>Cancel</Button></div>
                </form>
              </Card>
            );
          }
          return (
            <Card key={`${item.name}-${idx}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.name}</p>
                    {item.note ? <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-2xs uppercase tracking-wide text-text">{item.note}</span> : null}
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums text-num">{formatMoney(lineTotal).replace(" THB", "")}</p>
                  <p className="mt-1 text-sm tabular-nums text-num">{item.price.toFixed(2)} × {item.quantity ?? 1}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setForm({ name: item.name, price: String(item.price), quantity: String(item.quantity ?? 1), note: item.note ?? "" }); setEditingIndex(idx); setShowAddForm(false); }}>Edit</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (window.confirm("Delete?")) { setSession((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) })); showToast({ title: "Item deleted", kind: "success" }); } }}>Delete</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {showAddForm ? (
        <Card className="border-accent/30">
          <SectionLabel>Add new item</SectionLabel>
          <form onSubmit={submitItem} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Item name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            <Input placeholder="Price" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} required />
            <Input placeholder="Qty" type="number" min={1} value={form.quantity} onChange={(e) => setForm((s) => ({ ...s, quantity: e.target.value }))} required />
            <Input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} className="sm:col-span-2 lg:col-span-4" />
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit">Add item</Button><Button type="button" variant="outline" onClick={resetForms}>Cancel</Button></div>
          </form>
        </Card>
      ) : (
        <Button type="button" className="w-full sm:w-auto" onClick={() => { setForm(emptyForm); setEditingIndex(null); setShowAddForm(true); }}>Add item</Button>
      )}
    </div>
  );
}

function MembersView({ session, setSession }: { session: PartySession; setSession: React.Dispatch<React.SetStateAction<PartySession>> }) {
  const [name, setName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const payerData = useMemo(() => computePayerAmounts(session.items, session.members), [session.items, session.members]);
  const amountFor = (n: string) => payerData.find((p) => p.name === n)?.amount ?? 0;

  const toggleEdit = (index: number) => {
    setEditingIndex((prev) => (prev === index ? null : index));
  };

  const updateMemberAt = (index: number, patch: Partial<Member>) => {
    setSession((p) => ({
      ...p,
      members: p.members.map((m, i) => {
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
    setSession((p) => ({ ...p, members: p.members.filter((_, i) => i !== index) }));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && index < editingIndex) setEditingIndex(editingIndex - 1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-3">
        {session.members.map((member, idx) => {
          const isEditing = editingIndex === idx;
          const rowAmount = amountFor(member.name);

          return (
            <Card key={`${member.name}-${idx}`} className={isEditing ? "border-accent/40 shadow-glow" : ""}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/25 text-sm font-bold text-white transition-colors duration-300 ease-smooth">{memberInitial(member.name)}</div>
                  <button type="button" onClick={() => toggleEdit(idx)} className={`truncate text-left font-semibold text-text transition-all duration-300 ease-smooth ${isEditing ? "opacity-100" : "opacity-90 hover:opacity-100"}`} aria-expanded={isEditing}>{member.name}</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border px-2 py-0.5 text-2xs uppercase tracking-wide text-muted">{member.splitType === "ALL" ? "All" : "Partial"}</span>
                  <span className="min-w-[72px] text-right tabular-nums font-semibold text-num transition-all duration-450 ease-smooth">{rowAmount.toFixed(2)}</span>
                  <Button type="button" variant="danger" size="sm" onClick={() => deleteMember(idx)}>Delete</Button>
                </div>
              </div>

              <div className={`member-edit-panel ${isEditing ? "member-edit-panel--open" : "pointer-events-none"}`} aria-hidden={!isEditing}>
                <div className="member-edit-panel__inner space-y-4">
                  <Input value={member.name} onChange={(e) => updateMemberAt(idx, { name: e.target.value })} placeholder="Member name" tabIndex={isEditing ? 0 : -1} />
                  <div className="flex rounded-xl border border-border p-0.5">
                    <button type="button" onClick={() => setSplitType(idx, "ALL")} tabIndex={isEditing ? 0 : -1} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-smooth ${member.splitType === "ALL" ? "bg-accent text-white" : "text-muted hover:text-text"}`}>All</button>
                    <button type="button" onClick={() => setSplitType(idx, "PARTIAL")} tabIndex={isEditing ? 0 : -1} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-smooth ${member.splitType === "PARTIAL" ? "bg-accent text-white" : "text-muted hover:text-text"}`}>Partial</button>
                  </div>
                  {member.splitType === "PARTIAL" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted">Select items for {member.name || "member"}</p>
                      {session.items.map((item) => {
                        const checked = (member.itemNames ?? []).includes(item.name);
                        return (
                          <label key={item.name} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-300 ease-smooth ${checked ? "border-accent/40 bg-accent/10" : "border-border bg-surface/40 hover:bg-surface/70"}`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={checked} onChange={() => toggleItemForMember(idx, item.name)} tabIndex={isEditing ? 0 : -1} className="accent-accent" />
                              <span className="text-text">{item.name}</span>
                            </div>
                            <span className="tabular-nums text-sm text-num">{formatMoney(item.price * (item.quantity ?? 1))}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="New member name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button type="button" onClick={() => { if (name.trim()) { setSession((p) => ({ ...p, members: [...p.members, { name: name.trim(), splitType: "ALL", itemNames: [] }] })); setName(""); } }} className="shrink-0">Add</Button>
        </div>
        <p className="mt-3 text-xs text-muted">Partial members can choose which items they share. Unchecked items count as 0 THB.</p>
      </Card>
    </div>
  );
}

function SummaryView({ session, setSession, onGoHome }: { session: PartySession; setSession: React.Dispatch<React.SetStateAction<PartySession>>; onGoHome: () => void }) {
  const { showToast } = useToast();
  const payers = computePayerAmounts(session.items, session.members);
  const total = sessionTotal(session.items);

  const splitLabel = (payer: PayerRow) => {
    const member = session.members.find((m) => m.name === payer.name);
    if (member?.splitType === "PARTIAL") {
      const count = member.itemNames?.length ?? 0;
      return `Partial — ${count} item${count === 1 ? "" : "s"}`;
    }
    return "All items";
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card>
        <label htmlFor="party-name" className="text-sm font-medium text-text">Party Name:</label>
        <Input
          id="party-name"
          className="mt-3"
          placeholder="Enter party name"
          value={session.partyName}
          onChange={(e) => setSession((p) => ({ ...p, partyName: e.target.value }))}
        />
        <div className="mt-4 space-y-3">
          {payers.length > 0 && total > 0 ? (
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-muted">Bill split overview</p>
              <StackedShareBar segments={payers.map((p) => ({ name: p.name, amount: p.amount }))} total={total} />
            </div>
          ) : null}
          {payers.map((payer, index) => (
            <div key={payer.name} className="flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-4">
              <span className="badge-index flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{payer.name}</p>
                    <p className="text-sm text-muted">{splitLabel(payer)}</p>
                  </div>
                  <span className="chip-amount shrink-0 rounded-md px-2 py-0.5 tabular-nums font-semibold">{payer.amount.toFixed(2)}</span>
                </div>
                <PayerShareBar amount={payer.amount} total={total} name={payer.name} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionLabel>Digital slip</SectionLabel>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Party</dt><dd className="font-medium text-text">{session.partyName || "—"}</dd></div>
          <div><dt className="text-muted">Date</dt><dd className="font-medium text-text">{session.partyDate}</dd></div>
          <div><dt className="text-muted">Total items</dt><dd className="font-medium tabular-nums text-num">{session.items.length}</dd></div>
          <div><dt className="text-muted">Total amount</dt><dd className="font-medium tabular-nums text-num">{formatMoney(total)}</dd></div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Members</dt>
            <dd className="mt-2 space-y-1">
              {payers.map((p) => (<div key={p.name} className="flex justify-between tabular-nums"><span className="text-text">{p.name}</span><span className="chip-amount rounded-md px-2 py-0.5 font-semibold">{p.amount.toFixed(2)}</span></div>))}
            </dd>
          </div>
        </dl>
      </Card>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" className="inline-flex items-center justify-center rounded-xl border border-accent/40 bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-300 ease-smooth hover:border-accent/60 hover:bg-accent/10" onClick={onGoHome}>Back</button>
        <Button type="button" className="flex-1 sm:flex-none" disabled={!session.partyName.trim()} onClick={() => { showToast({ title: "Party saved", kind: "success" }); setSession((p) => ({ partyName: p.partyName.trim() || p.partyName, partyDate: new Date().toISOString().slice(0, 10), items: [], members: [] })); onGoHome(); }}>Confirm & share</Button>
      </div>
    </div>
  );
}

export default function CleftUI() {
  const [view, setView] = useState<AppView>("Home");
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [session, setSession] = useState<PartySession>(INITIAL_SESSION);

  const handleNav = (label: NavLabel) => {
    setView(label);
    if (label === "Home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ToastProvider>
      <TopNav activeView={view} onNav={handleNav} isAuthenticated={isAuthenticated} onToggleAuth={() => setIsAuthenticated((v) => !v)} />
      <main className="page-enter mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-20 sm:pb-12 sm:pt-24">
        {view === "Home" && <HomeView session={session} isAuthenticated={isAuthenticated} />}
        {view === "Items" && <ItemsView session={session} setSession={setSession} />}
        {view === "Members" && <MembersView session={session} setSession={setSession} />}
        {view === "Summary" && <SummaryView session={session} setSession={setSession} onGoHome={() => handleNav("Home")} />}
      </main>
    </ToastProvider>
  );
}
