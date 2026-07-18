# CLAUDE.md

This repo's canonical agent doc is **[AGENTS.md](./AGENTS.md)** — read it before touching anything. It covers what SariHub is, the three product realities that should drive every decision (the "wedge"), the tech stack, project structure, and the roadmap/to-do list.

Everything below is Claude-Code-specific pointers; it doesn't repeat what's already in AGENTS.md.

## Quick orientation

- **What this is**: a B2B ordering PWA for sari-sari store owners in Lucena, Quezon — wet-market goods + cooking essentials, ordered the night before, delivered by 6 AM truck.
- **Stack**: Next.js 15 App Router, TypeScript, tRPC, Drizzle on Supabase Postgres, phone-OTP auth only, Tailwind.
- **Bilingual**: Tagalog (default) + English, switchable on `/login`. Every user-facing string — client copy *and* server-emitted tRPC/Server Action messages — goes through `src/lib/i18n/dictionaries/{tl,en}.ts`. See the "Money is integer centavos..." paragraph in AGENTS.md's Project Structure section for the exact pattern before adding any new string.
- **Local dev login shortcut**: `/login` shows two one-click sign-in buttons outside `NODE_ENV=production`, using the Supabase project's `sms_test_otp` test numbers. Never renders or works in production (double-gated).

## Where things live

- `AGENTS.md` — canonical project doc + roadmap. Update it when you ship a roadmap item or learn something a future agent needs to know before touching this repo.
- `src/lib/i18n/` — bilingual dictionaries, `LanguageProvider` (client), `getServerLocale()` (server).
- `src/server/services/` — business logic (`orders.ts`, `stockouts.ts`, `auth.ts`). Routers under `src/server/routers/` stay thin over these.
- `drizzle/` — migrations plus their paired `_rls.sql` files (RLS policies + triggers ship alongside the migration that needs them, not bundled into one giant file).

## Working in this repo

- Run `pnpm typecheck && pnpm lint && pnpm test` before considering anything done — this project has zero tolerance for `any` (must carry a `// TODO(reason)`) and money is always integer centavos, never floats.
- The live Supabase project ("Sarihub", ap-southeast-1) is already wired — see AGENTS.md's roadmap for what's verified end-to-end and what's still stubbed (no real SMS provider yet, so only the two test-OTP numbers can sign in).
- When you add a roadmap item to AGENTS.md, keep the Done/Now/Next/Then structure — it's ordered by what unblocks what, not by feature area.
