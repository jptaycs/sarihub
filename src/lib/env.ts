import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  DATABASE_URL: z.string().min(10).optional(),
  SEMAPHORE_API_KEY: z.string().min(10).optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Lazy, validated env access. Throws on first access with missing/invalid vars,
 * not at module import time — so `next build` doesn't blow up on a fresh checkout.
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: keyof Env) {
    if (!cached) {
      const parsed = schema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL: process.env.DATABASE_URL,
        SEMAPHORE_API_KEY: process.env.SEMAPHORE_API_KEY,
        CRON_SECRET: process.env.CRON_SECRET,
      });
      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
          .join("\n");
        throw new Error(`Missing or invalid environment variables:\n${issues}\n\nSee .env.example.`);
      }
      cached = parsed.data;
    }
    return cached[prop];
  },
});
