import "server-only";

import { cookies } from "next/headers";

import {
  ADMIN_LOCALE_COOKIE,
  LOCALE_COOKIE,
  resolveLocale,
  type Locale,
  type LocaleArea,
} from "./locale";

/** The visitor's language for an area, read from the cookie that area's switcher sets. */
export async function getAreaLocale(area: LocaleArea): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(area, {
    app: store.get(LOCALE_COOKIE)?.value,
    admin: store.get(ADMIN_LOCALE_COOKIE)?.value,
  });
}

/** The signed-in-or-not visitor's language outside the admin console. */
export async function getServerLocale(): Promise<Locale> {
  return getAreaLocale("app");
}
