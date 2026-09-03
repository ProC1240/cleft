"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/axios";
import { API_BASE } from "@/lib/api-base";
import { memberInitial } from "@/lib/bill-display";

type ProfileForm = {
  username: string;
  avatar: string;
  currencySymbol: string;
};

function useIsMobileNav() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ username: "Guest", avatar: "", currencySymbol: "THB" });
  const [appliedProfileKey, setAppliedProfileKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isMobileNav = useIsMobileNav();

  const googleLoginUrl = `${API_BASE}/auth/google`;

  const { data: session } = useQuery({
    queryKey: ["top-nav-session"],
    queryFn: async () => (await api.get<{ authenticated: boolean }>("/auth/session")).data,
    retry: 0,
  });

  const isAuthenticated = !!session?.authenticated;

  const { data: profile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () =>
      (
        await api.get<{
          username: string;
          avatar?: string | null;
          currencySymbol: string;
        }>("/users/profile")
      ).data,
    enabled: isAuthenticated,
  });

  const profileKey = profile
    ? JSON.stringify([profile.username ?? "Guest", profile.avatar ?? "", profile.currencySymbol ?? "THB"])
    : null;
  if (profile && profileKey !== appliedProfileKey) {
    const nextProfile = {
      username: profile.username ?? "Guest",
      avatar: profile.avatar ?? "",
      currencySymbol: profile.currencySymbol ?? "THB",
    };
    setAppliedProfileKey(profileKey);
    setForm(nextProfile);
  }

  useEffect(() => {
    if (!open || isMobileNav) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isMobileNav]);

  useEffect(() => {
    if (!open || !isMobileNav) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobileNav]);

  const saveMutation = useMutation({
    mutationFn: async () => api.patch("/users/profile", form),
    onMutate: () => showToast({ title: "Saving profile...", kind: "info" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
      queryClient.invalidateQueries({ queryKey: ["top-nav-profile"] });
      showToast({ title: "Profile updated", kind: "success" });
    },
    onError: () => showToast({ title: "Profile update failed", description: "Please try again.", kind: "error" }),
  });

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      queryClient.clear();
      localStorage.removeItem("cleft-session");
      showToast({ title: "Logged out successfully", kind: "success" });
      setOpen(false);
      router.push("/");
    } catch {
      showToast({ title: "Logout failed", description: "Please try again.", kind: "error" });
    }
  };

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, avatar: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast({ title: "Please login first", kind: "info" });
      return;
    }
    await saveMutation.mutateAsync();
  };

  const displayName = isAuthenticated ? form.username || "Guest" : "Guest";

  const panelContent = (
    <>
      <p className="text-sm font-semibold text-text">Profile</p>

      {isAuthenticated ? (
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/40 bg-accent/25 text-lg font-bold text-white">
              {form.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                memberInitial(form.username)
              )}
            </div>
            <label className="flex-1 cursor-pointer">
              <span className="text-xs text-muted">Avatar</span>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
          />
          <Input
            placeholder="Currency (e.g. THB)"
            value={form.currencySymbol}
            onChange={(e) => setForm((s) => ({ ...s, currencySymbol: e.target.value }))}
          />

          <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
            Save profile
          </Button>

          <Button type="button" variant="outline" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted">Login to edit your profile and sync party history.</p>
          <a
            href={googleLoginUrl}
            className="btn-accent inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Login with Google
          </a>
        </div>
      )}
    </>
  );

  const mobileModal =
    open && isMobileNav
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close profile"
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Profile"
              className="toast-enter relative z-[1] w-full max-w-sm max-h-[min(32rem,calc(100vh-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              {panelContent}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-transparent p-0 text-[#6f6791] transition-colors duration-200 hover:text-text"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-muted/40 bg-transparent text-[0.7rem] font-medium text-muted">
          {form.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            memberInitial(displayName)
          )}
        </div>
        <span className="max-w-[120px] truncate text-[0.86rem] text-[#6f6791]">{displayName}</span>
      </button>

      {open && !isMobileNav ? (
        <div
          role="dialog"
          aria-modal="false"
          className="toast-enter absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          {panelContent}
        </div>
      ) : null}

      {mobileModal}
    </div>
  );
}
