import { forwardRef } from "react";

import { cn } from "~/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold tracking-tight whitespace-nowrap transition-[background-color,transform,opacity] duration-150 ease-[var(--ease-spring)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 select-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-action text-white hover:bg-action-press active:bg-action-press",
  secondary: "bg-surface-2 text-ink hover:bg-hair active:bg-hair",
  ghost: "bg-transparent text-ink hover:bg-surface-2 active:bg-surface-2",
  danger: "bg-danger-soft text-danger hover:bg-[#fbdde1] active:bg-[#fbdde1]",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[14px]",
  // 48px minimum tap; 56px for primary form CTAs.
  md: "h-tap px-5 text-[15px]",
  lg: "h-14 px-6 text-[17px]",
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
