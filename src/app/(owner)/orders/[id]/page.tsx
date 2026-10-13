import { PageHeader } from "~/components/ui/PageHeader";
import { getDictionary } from "~/lib/i18n/dictionaries";
import { getServerLocale } from "~/lib/i18n/server";

import { OrderDetailClient } from "./OrderDetailClient";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dict = getDictionary(await getServerLocale());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-28">
      <PageHeader title={dict.orderDetail.title} backHref="/orders" backLabel={dict.common.back} />
      <OrderDetailClient orderId={id} />
    </main>
  );
}
