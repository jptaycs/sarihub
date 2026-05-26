import "server-only";

import { publicProcedure, router } from "./init";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),
});

export type AppRouter = typeof appRouter;
