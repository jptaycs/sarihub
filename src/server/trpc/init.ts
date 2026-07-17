import "server-only";

import { TRPCError, initTRPC } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { createSupabaseServer } from "~/lib/supabase/server";

export async function createTRPCContext() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { db, supabase, user };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Hindi naka-sign in." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * Distributor staff only. Attaches the active `staff` row as ctx.staff.
 * Store owners (no staff row) get FORBIDDEN — buyer/admin/driver screens
 * must never be reachable from an owner account.
 */
export const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const [staffRow] = await ctx.db
    .select()
    .from(staff)
    .where(and(eq(staff.userId, ctx.user.id), eq(staff.isActive, true)))
    .limit(1);
  if (!staffRow) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Para sa staff lamang po ito." });
  }
  return next({ ctx: { ...ctx, staff: staffRow } });
});

/** Buyer screens: the palengke price board. Admins can also operate them. */
export const buyerProcedure = staffProcedure.use(async ({ ctx, next }) => {
  if (ctx.staff.role !== "buyer" && ctx.staff.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Para sa buyer staff lamang po ito." });
  }
  return next();
});

/** Admin screens: dispatch, catalog, suki exposure, stores. Admin role only. */
export const adminProcedure = staffProcedure.use(async ({ ctx, next }) => {
  if (ctx.staff.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Para sa admin lamang po ito." });
  }
  return next();
});
