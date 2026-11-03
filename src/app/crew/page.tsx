import { redirect } from "next/navigation";

/** /crew lands on the first job of the morning: packing. */
export default function CrewIndexPage() {
  redirect("/crew/pack");
}
