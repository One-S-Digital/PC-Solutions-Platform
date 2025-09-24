-- Check user with the Clerk ID from the logs
SELECT id, "clerkId", email, role, "createdAt", "updatedAt"
FROM "User"
WHERE "clerkId" = 'user_326OW0kp2tTae6lkVA7Vqosx72D';

-- If you need to update the role to SUPER_ADMIN, uncomment and run:
-- UPDATE "User"
-- SET role = 'SUPER_ADMIN'
-- WHERE "clerkId" = 'user_326OW0kp2tTae6lkVA7Vqosx72D';