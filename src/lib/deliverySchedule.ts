import { addDays, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { MANILA_TZ } from "./datetime";

/** The route fields delivery scheduling needs. Matches `routes` columns. */
export interface DeliverySchedule {
  /** "HH:MM" or "HH:MM:SS", Manila local. Orders before this ride today's truck. */
  cutoffLocal: string;
  /** Bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64. */
  activeWeekdays: number;
}

/**
 * The Manila day an order placed at `nowUtc` will be delivered on, as the UTC
 * instant of that day's Manila midnight.
 *
 * Before the cutoff on an active day → today's truck. Otherwise the next
 * active weekday. A 9 PM order against a 4:30 AM cutoff lands on tomorrow's
 * 6 AM route — that's the normal case.
 */
/**
 * The UTC instant of the route cutoff on an order's delivery day. `deliverOn`
 * is the Manila-midnight instant stored on the order. An order can still be
 * cancelled strictly before this instant — after it, the truck is loading.
 */
export function cutoffInstant(cutoffLocal: string, deliverOn: Date): Date {
  const [hh = 0, mm = 0] = cutoffLocal.split(":").map(Number);
  const day = toZonedTime(deliverOn, MANILA_TZ);
  day.setHours(hh, mm, 0, 0);
  return fromZonedTime(day, MANILA_TZ);
}

export function nextDeliveryDate(schedule: DeliverySchedule, nowUtc: Date): Date {
  const [hh = 0, mm = 0] = schedule.cutoffLocal.split(":").map(Number);
  const cutoffMinutes = hh * 60 + mm;

  const manilaNow = toZonedTime(nowUtc, MANILA_TZ);
  const beforeCutoff = manilaNow.getHours() * 60 + manilaNow.getMinutes() < cutoffMinutes;

  let day = startOfDay(manilaNow);
  if (!beforeCutoff) day = addDays(day, 1);

  // At most a week of scanning; a route with no active weekdays is a data bug.
  for (let i = 0; i < 7; i++) {
    if (schedule.activeWeekdays & (1 << day.getDay())) {
      return fromZonedTime(day, MANILA_TZ);
    }
    day = addDays(day, 1);
  }
  throw new Error("Route has no active weekdays.");
}

/**
 * The Manila day the *next* truck rides, across every route: the earliest
 * `nextDeliveryDate`. This is the day a buyer's stockout applies to — at 5 AM
 * in the palengke the cutoff has passed, so the next truck is tomorrow's —
 * the one owners are ordering for tonight. Before the cutoff it's today's.
 *
 * With no routes (a data bug) it degrades to today's Manila date so the price
 * board stays usable.
 */
export function nextTruckDay(schedules: DeliverySchedule[], nowUtc: Date): Date {
  let earliest: Date | null = null;
  for (const schedule of schedules) {
    const day = nextDeliveryDate(schedule, nowUtc);
    if (earliest === null || day < earliest) earliest = day;
  }
  return earliest ?? fromZonedTime(startOfDay(toZonedTime(nowUtc, MANILA_TZ)), MANILA_TZ);
}
