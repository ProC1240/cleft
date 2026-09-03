"use client";

/* eslint-disable react-hooks/set-state-in-effect -- hydration intentionally synchronizes React state with localStorage */

import { useEffect, useState } from "react";
import { BillItem, Member } from "@/lib/types";

type Session = {
  partyName: string;
  partyDate: string;
  items: BillItem[];
  members: Member[];
};

const KEY = "cleft-session";

export function usePartySession() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<Session>({
    partyName: "Friday Chill Party",
    partyDate: new Date().toISOString().slice(0, 10),
    items: [],
    members: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Session>;
        setSession((current) => ({
          partyName: typeof parsed.partyName === "string" ? parsed.partyName : current.partyName,
          partyDate: typeof parsed.partyDate === "string" ? parsed.partyDate : current.partyDate,
          items: Array.isArray(parsed.items)
            ? parsed.items.map((item) => ({ ...item, quantity: item.quantity ?? 1 }))
            : [],
          members: Array.isArray(parsed.members) ? parsed.members : [],
        }));
      } catch {
        localStorage.removeItem(KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(KEY, JSON.stringify(session));
  }, [isHydrated, session]);

  return { session, setSession };
}
