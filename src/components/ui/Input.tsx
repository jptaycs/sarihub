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
        "h-[52px] w-full rounded-md border border-transparent bg-surface-2 px-4 text-base font-medium text-ink outline-none transition-[border-color,background-color,box-shadow]",
        "focus:border-action focus:bg-surface focus:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]",
        "placeholder:font-normal placeholder:text-ink-3",
        className,
      )}
      {...rest}
    />
  );
});
