-- Migration to reconcile actual DB with Prisma schema (adds missing columns & normalizes status)
-- Safe / idempotent via IF NOT EXISTS + guarded blocks.

-- 1) Add missing columns
ALTER TABLE "public"."Project"
  ADD COLUMN IF NOT EXISTS "projectDataFolder" TEXT,
  ADD COLUMN IF NOT EXISTS "jobName" TEXT,
  ADD COLUMN IF NOT EXISTS "estimationRows" JSONB NOT NULL DEFAULT '[]';

-- 2) Convert enum-based status to TEXT (if currently USER-DEFINED) and set default 'PLANNING'
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'status';

    IF col_type = 'USER-DEFINED' THEN
        BEGIN
            ALTER TABLE "public"."Project" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Skipping status type alteration';
        END;
    END IF;

    BEGIN
        ALTER TABLE "public"."Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not set default for status';
    END;
END $$;

-- (Optional) Map legacy 'Live' status to 'PLANNING'
UPDATE "public"."Project" SET "status" = 'PLANNING' WHERE "status" = 'Live';
