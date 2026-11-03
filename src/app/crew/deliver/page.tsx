import { DriverClient } from "~/app/driver/DriverClient";

/**
 * The helper hands goods over from the passenger seat: same stop list, same
 * big "Naihatid" button and POD sheet as /driver, inside the crew shell.
 */
export default function CrewDeliverPage() {
  return <DriverClient />;
}
