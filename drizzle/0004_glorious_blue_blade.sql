CREATE TYPE "public"."product_category" AS ENUM('gulay', 'itlog', 'isda', 'kusina');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET DATA TYPE product_category;