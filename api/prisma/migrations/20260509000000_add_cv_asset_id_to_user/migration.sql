-- Add cvAssetId to users table so educators can link their CV upload asset
ALTER TABLE "users" ADD COLUMN "cvAssetId" TEXT;

ALTER TABLE "users"
    ADD CONSTRAINT "users_cvAssetId_fkey"
    FOREIGN KEY ("cvAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
