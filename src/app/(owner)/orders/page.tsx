import { PageHeader } from "~/components/ui/PageHeader";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  const dict = getDictionary(await getServerLocale());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-28">
      <PageHeader title={dict.orders.title} backHref="/home" backLabel={dict.common.back} />
      <OrdersClient />
    </main>
  );
}
