import { prisma } from '../src/lib/prisma.js';
async function main(){
  const statements = [
    `ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "projectDataFolder" TEXT;`,
    `ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "jobName" TEXT;`,
    `ALTER TABLE "public"."Project" ADD COLUMN IF NOT EXISTS "estimationRows" JSONB NOT NULL DEFAULT '[]';`,
    // Convert status to TEXT if it's an enum
    `DO $$\nDECLARE col_type TEXT; BEGIN SELECT data_type INTO col_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'status'; IF col_type = 'USER-DEFINED' THEN BEGIN EXECUTE 'ALTER TABLE "public"."Project" ALTER COLUMN "status" TYPE TEXT USING "status"::text'; EXCEPTION WHEN others THEN RAISE NOTICE 'Skipping status type alteration'; END; END IF; BEGIN EXECUTE 'ALTER TABLE "public"."Project" ALTER COLUMN "status" SET DEFAULT ''PLANNING'''; EXCEPTION WHEN others THEN RAISE NOTICE 'Could not set default for status'; END; END $$;`,
    `UPDATE "public"."Project" SET "status" = 'PLANNING' WHERE "status" = 'Live';`
  ];
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('✅ Manual migration statements executed');
  } catch (e) {
    console.error('❌ Manual migration failed', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
