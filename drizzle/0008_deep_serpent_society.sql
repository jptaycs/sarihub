ALTER TABLE "suki_ledger" ADD COLUMN "idempotency_key" varchar(64);--> statement-breakpoint
ALTER TABLE "suki_ledger" ADD CONSTRAINT "suki_ledger_idempotency_key_unique" UNIQUE("idempotency_key");