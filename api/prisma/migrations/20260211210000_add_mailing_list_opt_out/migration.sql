-- Add explicit mailing list opt-out field.
-- Default is false (opted IN). Only set to true when a user explicitly
-- unsubscribes via their notification settings or an unsubscribe link.
-- This is separate from the "marketing" column which controls promotional
-- notification preferences.
ALTER TABLE "user_notification_preferences"
ADD COLUMN "mailing_list_opt_out" BOOLEAN NOT NULL DEFAULT false;
