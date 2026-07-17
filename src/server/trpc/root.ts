import "server-only";

import { adminRouter } from "~/server/routers/admin";
import { buyerRouter } from "~/server/routers/buyer";
import { catalogRouter } from "~/server/routers/catalog";
import { ordersRouter } from "~/server/routers/orders";
import { storeRouter } from "~/server/routers/store";
import { publicProcedure, router } from "./init";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),
  catalog: catalogRouter,
  store: storeRouter,
  orders: ordersRouter,
  buyer: buyerRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
