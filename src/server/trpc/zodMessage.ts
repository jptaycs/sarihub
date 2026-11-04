import type { ZodError } from "zod";

import { getDictionary } from "~/lib/i18n/dictionaries";
import type { Locale } from "~/lib/i18n/locale";
import { fieldError } from "~/lib/i18n/validation";

/**
 * The user-facing message for a tRPC input that failed zod validation: the
 * first issue, translated in the request's locale. Without this, the client
 * sees zod's JSON-encoded issue list as `error.message`.
 */
export function zodErrorMessage(locale: Locale, error: ZodError): string {
  const dict = getDictionary(locale);
  return fieldError(dict, error.issues[0]?.message) ?? dict.validation.invalid;
}
