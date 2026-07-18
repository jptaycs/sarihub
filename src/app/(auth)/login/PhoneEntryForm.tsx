"use client";

import { useActionState } from "react";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

import { startOtpAction, type LoginActionState } from "./actions";

export function PhoneEntryForm() {
  const dict = useDictionary();
  const [state, formAction, pending] = useActionState<LoginActionState, FormData>(
    startOtpAction,
    null,
  );

  return (
    <form action={formAction} className="mt-9">
      <label htmlFor="phone" className="mb-2 block text-xs text-ink-2">
        {dict.login.phoneLabel}
      </label>
      <div className="flex gap-[10px]">
        <div className="flex h-14 w-[76px] items-center justify-center gap-1.5 rounded-md bg-[#F1ECE2] text-base font-medium text-ink">
          <PhFlag />
          +63
        </div>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="917 845 2310"
          required
          className="h-14 flex-1 text-lg tracking-[0.02em]"
          aria-invalid={state?.error ? true : undefined}
        />
      </div>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" block size="lg" className="mt-6" disabled={pending}>
        {pending ? dict.login.sending : dict.login.sendCode}
      </Button>
    </form>
  );
}

function PhFlag() {
  return (
    <span
      aria-hidden
      className="relative block h-3 w-[18px] overflow-hidden rounded-[2px]"
      style={{ background: "linear-gradient(to bottom, #0038A8 50%, #CE1126 50%)" }}
    >
      <span
        className="absolute inset-y-0 left-0 w-[7px] bg-white"
        style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }}
      />
    </span>
  );
}
