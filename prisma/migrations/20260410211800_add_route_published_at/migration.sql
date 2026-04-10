ALTER TABLE "Route"
ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Route"
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

UPDATE "Route"
SET "publishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "isPublished" = true;

CREATE INDEX IF NOT EXISTS "Route_isPublished_publishedAt_idx"
ON "Route"("isPublished", "publishedAt");
