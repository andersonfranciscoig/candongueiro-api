-- AlterTable
ALTER TABLE "users" ADD COLUMN "homeRole" "Role";

-- Backfill: contas existentes usam o role actual como home
UPDATE "users" SET "homeRole" = "role" WHERE "homeRole" IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE "users" ALTER COLUMN "homeRole" SET NOT NULL;
