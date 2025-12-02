-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'SIDEBAR_LOGO';

-- AlterTable
ALTER TABLE "frontend_settings" ADD COLUMN "sidebarLogoAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "frontend_settings" ADD CONSTRAINT "frontend_settings_sidebarLogoAssetId_fkey" FOREIGN KEY ("sidebarLogoAssetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
