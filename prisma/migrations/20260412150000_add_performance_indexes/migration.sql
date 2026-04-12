CREATE INDEX "Photo_createdAt_idx" ON "Photo"("createdAt");

CREATE INDEX "Route_createdById_createdAt_idx" ON "Route"("createdById", "createdAt");

CREATE INDEX "RoutePhoto_photoId_idx" ON "RoutePhoto"("photoId");
