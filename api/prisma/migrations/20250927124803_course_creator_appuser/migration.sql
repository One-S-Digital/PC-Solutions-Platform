-- DropForeignKey
ALTER TABLE "public"."courses" DROP CONSTRAINT "courses_createdBy_fkey";

-- AddForeignKey
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

