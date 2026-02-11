-- CreateTable ProjectConfigSection (idempotent: skip if exists)
CREATE TABLE IF NOT EXISTS "ProjectConfigSection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeSlug" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectConfigSection_pkey" PRIMARY KEY ("id")
);

-- Add FK to Project (only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectConfigSection_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectConfigSection"
      ADD CONSTRAINT "ProjectConfigSection_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Only alter ProjectLink if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ProjectLink') THEN
    -- Add column if not exists (PG 9.5+)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ProjectLink' AND column_name = 'sectionId'
    ) THEN
      ALTER TABLE "ProjectLink" ADD COLUMN "sectionId" TEXT;

      -- Create default section per project that has links
      INSERT INTO "ProjectConfigSection" ("id", "projectId", "name", "typeSlug", "order", "createdAt")
      SELECT gen_random_uuid()::text, "projectId", 'Risorse e link', 'links', 0, CURRENT_TIMESTAMP
      FROM (SELECT DISTINCT "projectId" FROM "ProjectLink") AS p;

      UPDATE "ProjectLink" pl
      SET "sectionId" = s."id"
      FROM "ProjectConfigSection" s
      WHERE s."projectId" = pl."projectId";

      ALTER TABLE "ProjectLink" ALTER COLUMN "sectionId" SET NOT NULL;
      ALTER TABLE "ProjectLink" ADD CONSTRAINT "ProjectLink_sectionId_fkey"
        FOREIGN KEY ("sectionId") REFERENCES "ProjectConfigSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
