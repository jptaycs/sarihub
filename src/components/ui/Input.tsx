import { forwardRef } from "react";

import { cn } from "~/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-[52px] w-full rounded-md border border-hair-strong bg-white px-[14px] text-base font-medium text-ink outline-none",
        "focus:border-action focus:shadow-[0_0_0_3px_rgba(216,90,48,0.15)]",
        "placeholder:text-ink-3",
        className,
      )}
      {...rest}
    />
  );
});
