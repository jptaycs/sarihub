import "server-only";

import { catalogRouter } from "~/server/routers/catalog";
import { ordersRouter } from "~/server/routers/orders";
import { storeRouter } from "~/server/routers/store";
import { publicProcedure, router } from "./init";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),
  catalog: catalogRouter,
  store: storeRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
