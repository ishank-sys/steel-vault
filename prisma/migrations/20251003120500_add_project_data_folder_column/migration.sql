-- 1) Add missing columns used by application & seed script
ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "projectDataFolder" TEXT;
ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "jobName" TEXT;
ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "estimationRows" JSONB NOT NULL DEFAULT '[]';

-- 2) Ensure status column is plain TEXT (some DBs have old enum project_status). Wrap in DO block for idempotency.
DO $$
DECLARE
	col_type TEXT;
BEGIN
	SELECT data_type INTO col_type
	FROM information_schema.columns
	WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'status';

	-- If it's an enum (USER-DEFINED) change to TEXT
	IF col_type = 'USER-DEFINED' THEN
		BEGIN
			ALTER TABLE "public"."Project" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
		EXCEPTION WHEN others THEN
			RAISE NOTICE 'Skipping status type alteration (already TEXT or conversion failed)';
		END;
	END IF;

	-- Align default with Prisma schema (PLANNING). Only set if current default differs.
	BEGIN
		ALTER TABLE "public"."Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
	EXCEPTION WHEN others THEN
		RAISE NOTICE 'Could not set default for status';
	END;
END $$;

-- 3) (Optional) If you want to remap legacy value 'Live' to 'PLANNING', uncomment below:
-- UPDATE "public"."Project" SET "status" = 'PLANNING' WHERE "status" = 'Live';

