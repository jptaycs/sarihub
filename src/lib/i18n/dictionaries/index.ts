import type { Locale } from "../locale";
import { en } from "./en";
import { tl } from "./tl";

export type { Dictionary } from "./tl";

const dictionaries = { tl, en };

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
