import { forwardRef } from "react";

import { cn } from "~/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-tight whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-action text-white active:bg-action-press",
  secondary: "bg-white text-ink border border-hair-strong active:bg-surface-2",
  ghost: "bg-transparent text-ink active:bg-surface-2",
  danger: "bg-white text-danger border border-[#EBD3CF] active:bg-[#FAEAE7]",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  // 48px minimum tap; 56px for primary form CTAs per the prototype.
  md: "h-tap px-[18px] text-[15px]",
  lg: "h-14 px-5 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variantClasses[variant], sizeClasses[size], block && "w-full", className)}
      {...rest}
    />
  );
});
