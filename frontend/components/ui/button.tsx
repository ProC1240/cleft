"use client";

import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm";
};

export function Button({ className = "", variant = "default", size = "default", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
  const sizes = size === "sm" ? "rounded-lg px-3 py-1.5 text-xs" : "rounded-full px-5 py-2.5 text-sm";
  const style =
    variant === "outline"
      ? "rounded-xl border border-border bg-transparent text-muted hover:border-muted/50 hover:text-text"
      : variant === "ghost"
        ? "rounded-lg text-muted hover:bg-surface hover:text-text"
        : variant === "danger"
          ? "rounded-lg border border-red-400/20 bg-transparent text-red-300/80 hover:bg-red-500/10 hover:text-red-200"
          : "btn-accent";
  return <button className={`${base} ${sizes} ${style} ${className}`} {...props} />;
}
