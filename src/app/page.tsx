import { redirect } from "next/navigation";

/** The storefront is public — guests land straight on today's catalog. */
export default function RootPage() {
  redirect("/home");
}
