import type { Dictionary } from "./dictionaries/tl";

/**
 * Zod schemas under `src/lib/schemas/` are shared by react-hook-form on the
 * client and the tRPC routers on the server, so they can't carry copy in one
 * language. They carry a *key* instead (`validationMessage("required")`),
 * and the two readers translate it:
 *   - client forms: `fieldError(dict, formState.errors.x?.message)`
 *   - tRPC: the error formatter in `server/trpc/init.ts` via `zodErrorMessage`
 * Anything that isn't a known key (zod's own "Invalid uuid", "Too small", …)
 * collapses to `dict.validation.invalid` so raw English never leaks.
 */
export type ValidationKey = keyof Dictionary["validation"];

const PREFIX = "validation.";

export function validationMessage(key: ValidationKey): string {
  return `${PREFIX}${key}`;
}

export function fieldError(dict: Dictionary, message: string | undefined): string | undefined {
  if (message === undefined) return undefined;
  if (message.startsWith(PREFIX)) {
    const key = message.slice(PREFIX.length);
    if (Object.hasOwn(dict.validation, key)) return dict.validation[key as ValidationKey];
  }
  return dict.validation.invalid;
}
