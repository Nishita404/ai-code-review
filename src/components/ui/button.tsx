import type { ButtonHTMLAttributes, AnchorHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "secondary" | "ghost";

type ButtonProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
} & DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

type ButtonLinkProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
} & DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

const baseClasses =
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-[0_18px_40px_rgba(255,255,255,0.08)]",
  secondary: "border border-white/15 bg-white/5 text-white hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 hover:shadow-[0_16px_36px_rgba(0,0,0,0.25)]",
  ghost: "bg-transparent text-slate-300 hover:-translate-y-0.5 hover:bg-white/5 hover:text-white",
};

export function Button({ variant = "default", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "default", className, children, ...props }: ButtonLinkProps) {
  return (
    <a className={cn(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </a>
  );
}