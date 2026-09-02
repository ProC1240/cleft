"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import { ProfileMenu } from "@/components/profile-menu";
import { api } from "@/lib/axios";

const links = [
  { href: "/", label: "Home" },
  { href: "/items", label: "Items" },
  { href: "/members", label: "Members" },
  { href: "/summary", label: "Summary" },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useQuery({
    queryKey: ["top-nav-session"],
    queryFn: async () => (await api.get<{ authenticated: boolean }>("/auth/session")).data,
    retry: 0,
  });
  const isAuthenticated = !!session?.authenticated;

  const navLinks = (
    <nav className="nav-scroll flex items-center gap-1 overflow-x-auto sm:justify-center" aria-label="Primary navigation">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={`shrink-0 rounded-full px-3 py-2 text-sm transition-colors duration-200 sm:px-4 ${
            pathname === link.href ? "bg-accent font-medium text-white" : "text-muted hover:text-text"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0c0a1a]/80 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">
        <div className={`flex items-center justify-between gap-4 ${isAuthenticated ? "sm:grid sm:grid-cols-[1fr_auto_1fr]" : ""}`}>
          <Link href="/" className="shrink-0" aria-label="cleft home">
            <AppLogo size="md" variant="square" />
          </Link>

          {isAuthenticated ? <div className="hidden min-w-0 sm:block sm:justify-self-center">{navLinks}</div> : null}

          <div className="shrink-0 sm:justify-self-end">
            <ProfileMenu />
          </div>
        </div>

        {isAuthenticated ? <div className="mt-2 sm:hidden">{navLinks}</div> : null}
      </div>
    </header>
  );
}
