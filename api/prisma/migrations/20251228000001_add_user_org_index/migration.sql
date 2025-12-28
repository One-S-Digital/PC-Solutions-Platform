-- CreateIndex
-- Optimizes primary organization lookup in auth guard (userId + createdAt ordering)
CREATE INDEX "user_organizations_userId_createdAt_idx" ON "user_organizations"("userId", "createdAt");
