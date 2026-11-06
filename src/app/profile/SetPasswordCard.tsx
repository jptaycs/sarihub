"use client";

import { useActionState, useState } from "react";

import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

import { setPasswordAction, type SetPasswordState } from "./actions";

/** Lets an SMS-code or Google account add a password for number + password sign-in. */
export function SetPasswordCard() {
  const dict = useDictionary();
  const t = dict.profile;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SetPasswordState, FormData>(setPasswordAction, null);

  return (
    <>
      <p className="section-label mb-2 mt-6 px-1">{t.passwordHeading}</p>
      <Card className="px-4 py-4">
        <p className="text-[14px] text-ink-2">{t.passwordHint}</p>
        {state?.ok && !open ? (
          <p role="status" className="mt-3 text-[14px] font-medium text-success">
            {t.passwordSaved}
          </p>
        ) : null}
        {open ? (
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-[13px] font-medium text-ink-2">
                {t.newPassword}
              </label>
              <Input id="new-password" name="password" type="password" autoComplete="new-password" required className="h-12" />
              <p className="mt-1.5 text-[13px] text-ink-2">{dict.signUp.passwordHint}</p>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="mb-2 block text-[13px] font-medium text-ink-2">
                {t.confirmNewPassword}
              </label>
              <Input id="confirm-new-password" name="confirmPassword" type="password" autoComplete="new-password" required className="h-12" />
            </div>
            {state?.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
            {state?.ok ? (
              <p role="status" className="text-[14px] font-medium text-success">
                {t.passwordSaved}
              </p>
            ) : null}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
                {t.cancel}
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? t.savingPassword : t.savePassword}
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="secondary" block className="mt-4" onClick={() => setOpen(true)}>
            {t.setPassword}
          </Button>
        )}
      </Card>
    </>
  );
}
