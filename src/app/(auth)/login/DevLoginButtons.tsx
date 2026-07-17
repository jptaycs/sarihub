"use client";

import { useActionState } from "react";

import { Button } from "~/components/ui/Button";

import { devLoginAction, type DevAccount, type DevLoginState } from "./devLoginAction";

/** Renders nothing outside development — gated again server-side in devLoginAction. */
export function DevLoginButtons() {
  const [state, formAction, pending] = useActionState<DevLoginState, FormData>(
    devLoginAction,
    null,
  );

  return (
    <div className="mt-6 rounded-md border border-dashed border-hair-strong bg-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">
        Dev shortcut — hindi lalabas sa production
      </p>
      <div className="mt-3 flex gap-2">
        <DevButton account="owner" label="Owner" action={formAction} pending={pending} />
        <DevButton account="staff" label="Staff (admin)" action={formAction} pending={pending} />
      </div>
      {state?.error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function DevButton(props: {
  account: DevAccount;
  label: string;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={props.action} className="flex-1">
      <input type="hidden" name="account" value={props.account} />
      <Button
        type="submit"
        variant="secondary"
        block
        disabled={props.pending}
        className="h-10 text-[13px]"
      >
        {props.pending ? "…" : `Mag-login: ${props.label}`}
      </Button>
    </form>
  );
}
