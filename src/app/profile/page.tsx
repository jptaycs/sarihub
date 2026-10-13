import { Card, CardRow } from "~/components/ui/Card";
import { LanguageSwitcher } from "~/components/ui/LanguageSwitcher";
import { OwnerTabBar } from "~/components/ui/OwnerTabBar";
import { PageHeader } from "~/components/ui/PageHeader";
import { SignOutButton } from "~/components/ui/SignOutButton";
import { formatPeso, formatPhone } from "~/lib/format";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";
import { createSupabaseServer } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { activeStaffForRequest } from "~/server/services/auth";
import { getStoreForOwner } from "~/server/services/store";

/**
 * One page for every role. `/profile` sits outside the `(owner)` route
 * group deliberately — it must be reachable by owners *and* staff, each with
 * different chrome (owner gets the persistent tab bar rendered directly
 * here; staff get the minimal back-chevron header buyer/driver/admin use).
 */
export default async function ProfilePage() {
  const dict = getDictionary(await getServerLocale());
  const staffRow = await activeStaffForRequest();

  if (staffRow) {
    const roleLabel =
      staffRow.role === "admin"
        ? dict.profile.roleAdmin
        : staffRow.role === "buyer"
          ? dict.profile.roleBuyer
          : dict.profile.roleDriver;

    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-10">
        <PageHeader title={dict.profile.title} backHref="/" backLabel={dict.common.back} />

        <p className="section-label mb-2 mt-2 px-1">{dict.profile.staffInfoHeading}</p>
        <Card>
          <CardRow className="flex items-center justify-between">
            <span className="text-[15px] text-ink-2">{dict.profile.ownerName}</span>
            <span className="text-[15px] font-medium">{staffRow.name}</span>
          </CardRow>
          <CardRow className="flex items-center justify-between">
            <span className="text-[15px] text-ink-2">{dict.profile.mobile}</span>
            <span className="price text-[15px] font-medium">
              {formatPhone(staffRow.phoneE164)}
            </span>
          </CardRow>
          <CardRow className="flex items-center justify-between">
            <span className="text-[15px] text-ink-2">{dict.profile.staffRole}</span>
            <span className="text-[15px] font-medium">{roleLabel}</span>
          </CardRow>
        </Card>

        <p className="section-label mb-2 mt-6 px-1">{dict.profile.languageHeading}</p>
        <Card className="px-4 py-3.5">
          <LanguageSwitcher />
        </Card>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const store = user ? await getStoreForOwner(db, user.id) : null;

  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-28">
        <PageHeader title={dict.profile.title} />

        {store ? (
          <>
            <p className="section-label mb-2 mt-2 px-1">{dict.profile.storeInfoHeading}</p>
            <Card>
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.storeName}</span>
                <span className="text-[15px] font-medium">{store.name}</span>
              </CardRow>
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.ownerName}</span>
                <span className="text-[15px] font-medium">{store.ownerName}</span>
              </CardRow>
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.mobile}</span>
                <span className="price text-[15px] font-medium">
                  {formatPhone(store.phoneE164)}
                </span>
              </CardRow>
              {store.addressLine && (
                <CardRow className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-[15px] text-ink-2">{dict.profile.address}</span>
                  <span className="text-right text-[15px] font-medium">{store.addressLine}</span>
                </CardRow>
              )}
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.route}</span>
                <span className="text-[15px] font-medium">
                  {store.routeName ?? dict.profile.noRoute}
                </span>
              </CardRow>
            </Card>

            <p className="section-label mb-2 mt-6 px-1">{dict.profile.sukiHeading}</p>
            <Card>
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.sukiBalance}</span>
                <span className="price text-[15px] font-semibold">
                  {formatPeso(store.sukiBalanceCentavos)}
                </span>
              </CardRow>
              <CardRow className="flex items-center justify-between">
                <span className="text-[15px] text-ink-2">{dict.profile.sukiLimit}</span>
                <span className="price text-[15px] font-medium">
                  {formatPeso(store.sukiLimitCentavos)}
                </span>
              </CardRow>
            </Card>
          </>
        ) : (
          <div className="mt-2 rounded-md bg-warning-soft px-4 py-3 text-[14px] text-warning">
            {dict.profile.noStore}
          </div>
        )}

        <p className="section-label mb-2 mt-6 px-1">{dict.profile.languageHeading}</p>
        <Card className="px-4 py-3.5">
          <LanguageSwitcher />
        </Card>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </main>
      <OwnerTabBar signedIn />
    </>
  );
}
