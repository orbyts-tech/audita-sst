import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  accent: "bg-logo-orange text-navy-900 hover:bg-logo-esocial",
  secondary: "bg-surface-0 text-blue-600 border border-border hover:border-blue-600 hover:bg-blue-100",
  ghost: "bg-transparent text-blue-600 hover:bg-blue-100",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm gap-2",
  md: "h-12 px-5 text-[15px] gap-2",
  lg: "h-[52px] px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", iconLeft, iconRight, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-border disabled:text-ink-muted",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
