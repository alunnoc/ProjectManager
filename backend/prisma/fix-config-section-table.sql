-- Esegui questo file SOLO se la tabella ProjectConfigSection non esiste
-- (es. migrazione segnata come applicata ma tabella mai creata).
-- Da terminale: npx prisma db execute --file prisma/fix-config-section-table.sql

CREATE TABLE IF NOT EXISTS "ProjectConfigSection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeSlug" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectConfigSection_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectConfigSection_projectId_fkey') THEN
    ALTER TABLE "ProjectConfigSection"
      ADD CONSTRAINT "ProjectConfigSection_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
