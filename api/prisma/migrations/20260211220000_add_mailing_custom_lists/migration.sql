-- Custom mailing lists — admin-curated static lists of users
CREATE TABLE "mailing_custom_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mailing_custom_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mailing_custom_list_members" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailing_custom_list_members_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "mailing_custom_lists_created_by_id_idx" ON "mailing_custom_lists"("created_by_id");
CREATE INDEX "mailing_custom_list_members_list_id_idx" ON "mailing_custom_list_members"("list_id");
CREATE INDEX "mailing_custom_list_members_user_id_idx" ON "mailing_custom_list_members"("user_id");

-- Unique constraint: a user can only be in a list once
CREATE UNIQUE INDEX "mailing_custom_list_members_list_id_user_id_key"
    ON "mailing_custom_list_members"("list_id", "user_id");

-- Foreign keys
ALTER TABLE "mailing_custom_list_members"
    ADD CONSTRAINT "mailing_custom_list_members_list_id_fkey"
    FOREIGN KEY ("list_id") REFERENCES "mailing_custom_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mailing_custom_list_members"
    ADD CONSTRAINT "mailing_custom_list_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
