-- CreateTable
CREATE TABLE "mailing_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mailing_templates_created_by_id_idx" ON "mailing_templates"("created_by_id");
