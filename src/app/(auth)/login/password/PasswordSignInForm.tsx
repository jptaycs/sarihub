"use client";

import { useActionState } from "react";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

import { passwordSignInAction, type PasswordSignInState } from "./actions";

export function PasswordSignInForm({ next }: { next: string }) {
  const dict = useDictionary();
  const [state, formAction, pending] = useActionState<PasswordSignInState, FormData>(
    passwordSignInAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="phone" className="mb-2 block text-[13px] font-medium text-ink-2">
          {dict.login.phoneLabel}
        </label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="0917 845 2310" defaultValue={state?.phone} required className="h-14 text-[19px] tracking-[0.02em]" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-ink-2">
          {dict.login.passwordLabel}
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-14" />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" block size="lg" className="mt-1" disabled={pending}>
        {pending ? dict.login.signingIn : dict.login.signInButton}
      </Button>
    </form>
  );
}
