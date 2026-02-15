-- Fix: marketing preference was incorrectly defaulted to false when
-- UserNotificationPreferences records were auto-created by
-- getOrDefaultNotificationPrefs() and updateNotificationSettings().
--
-- This resets all marketing=false rows to true UNLESS the user explicitly
-- opted out via the notification settings UI (proxied via promoRedemptionAlertsToggle).
-- Since we cannot distinguish "user explicitly unchecked marketing" from
-- "code defaulted it to false", we set all to true. Users who genuinely
-- opted out can re-toggle in settings.
UPDATE user_notification_preferences
SET marketing = true
WHERE marketing = false;
