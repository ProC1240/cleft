"use client";

import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const fileStyles =
  "file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:brightness-110";

export function Input({ className = "", type, ...props }: Props) {
  return (
    <input
      type={type}
      className={`w-full min-w-0 rounded-xl border border-border bg-surface p-3 text-sm text-text outline-none ring-0 transition-colors duration-200 placeholder:text-[#6f6791] focus:border-accent ${type === "file" ? fileStyles : ""} ${className}`}
      {...props}
    />
  );
}
