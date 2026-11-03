"use client";

import { Minus, Plus } from "lucide-react";

/**
 * The black pill quantity stepper from the owner catalog, shared with the
 * crew app's POS and stock screens. 44px targets so a thumb on a bumpy road
 * still lands.
 */
export function Stepper(props: {
  qty: number;
  onChange: (qty: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  min?: number;
}) {
  const min = props.min ?? 0;
  return (
    <span className="animate-pop-in inline-flex h-11 shrink-0 items-center rounded-pill bg-action text-white">
      <button
        type="button"
        aria-label={props.decreaseLabel}
        disabled={props.qty <= min}
        onClick={() => props.onChange(Math.max(min, props.qty - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/15 disabled:opacity-40"
      >
        <Minus size={20} strokeWidth={2.5} />
      </button>
      <span className="tnum min-w-7 text-center text-[17px] font-bold">{props.qty}</span>
      <button
        type="button"
        aria-label={props.increaseLabel}
        onClick={() => props.onChange(props.qty + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/15"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </span>
  );
}
