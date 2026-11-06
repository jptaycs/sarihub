"use client";

import { useActionState } from "react";

import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useDictionary } from "~/lib/i18n/LanguageProvider";

import { signUpAction, type SignUpField, type SignUpState } from "./actions";

export function SignUpForm({ next }: { next: string }) {
  const dict = useDictionary();
  const t = dict.signUp;
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUpAction, null);
  const err = (f: SignUpField) => state?.fieldErrors?.[f];

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <Row id="fullName" label={t.fullName} error={err("fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" defaultValue={state?.values?.fullName} required aria-invalid={err("fullName") ? true : undefined} className="h-14" />
      </Row>
      <Row id="storeName" label={t.storeName} error={err("storeName")}>
        <Input id="storeName" name="storeName" autoComplete="organization" defaultValue={state?.values?.storeName} required aria-invalid={err("storeName") ? true : undefined} className="h-14" />
      </Row>
      <Row id="phone" label={t.phone} error={err("phone")}>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="0917 845 2310" defaultValue={state?.values?.phone} required aria-invalid={err("phone") ? true : undefined} className="h-14" />
      </Row>
      <Row id="addressLine" label={t.address} error={err("addressLine")}>
        <Input id="addressLine" name="addressLine" autoComplete="street-address" placeholder={t.addressPlaceholder} defaultValue={state?.values?.addressLine} className="h-14" />
      </Row>
      <Row id="password" label={t.password} hint={t.passwordHint} error={err("password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={err("password") ? true : undefined} className="h-14" />
      </Row>
      <Row id="confirmPassword" label={t.confirmPassword} error={err("confirmPassword")}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={err("confirmPassword") ? true : undefined} className="h-14" />
      </Row>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" block size="lg" className="mt-1" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

function Row(props: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.id} className="mb-2 block text-[13px] font-medium text-ink-2">
        {props.label}
      </label>
      {props.children}
      {props.error ? (
        <p className="mt-1.5 text-sm text-danger">{props.error}</p>
      ) : props.hint ? (
        <p className="mt-1.5 text-[13px] text-ink-2">{props.hint}</p>
      ) : null}
    </div>
  );
}
