import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-slate-500 shadow-sm outline-none transition-all duration-300 ease-out focus:border-emerald-400/30 focus:bg-white/[0.05] focus:shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_0_24px_rgba(52,211,153,0.08)] focus:ring-1 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}