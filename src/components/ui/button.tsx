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
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-white text-slate-950 hover:bg-slate-200",
  secondary: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
  ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
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