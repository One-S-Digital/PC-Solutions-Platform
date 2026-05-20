-- AddForeignKey
ALTER TABLE "mailing_templates" ADD CONSTRAINT "mailing_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
