ALTER TABLE "Photo" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Route" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Photo_viewCount_idx" ON "Photo"("viewCount");
CREATE INDEX "Route_viewCount_idx" ON "Route"("viewCount");
