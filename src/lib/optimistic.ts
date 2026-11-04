/**
 * Pure cache updates for optimistic mutations. The screens apply these to
 * the React Query cache in `onMutate`, roll back to the snapshot in
 * `onError`, and invalidate in `onSettled` so the server's answer wins.
 */

/** The board/list copy with one order's status moved; the same array when the order isn't there. */
export function advanceOrderStatus<T extends { id: string; status: string }>(
  orders: readonly T[],
  orderId: string,
  status: T["status"],
): readonly T[] {
  if (!orders.some((o) => o.id === orderId)) return orders;
  return orders.map((o) => (o.id === orderId ? { ...o, status } : o));
}

/** The stop list with one stop marked delivered. */
export function markStopDelivered<T extends { id: string; status: string }>(
  stops: readonly T[],
  orderId: string,
): readonly T[] {
  return advanceOrderStatus(stops, orderId, "delivered");
}
