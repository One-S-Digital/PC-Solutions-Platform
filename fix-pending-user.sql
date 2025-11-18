-- Fix Pending User - Manually Create User in Database
-- This is needed for local development since Clerk webhooks can't reach localhost

-- Insert the user into AppUser table
-- Change the email and role as needed
INSERT INTO "AppUser" (id, "clerkId", email, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'user_328ncCGDqfKdeM93XJAtxIwUO95',
  'your-email@example.com',  -- 👈 CHANGE THIS to your actual email
  'PARENT',                   -- 👈 CHANGE THIS if you want a different role (PARENT, EDUCATOR, FOUNDATION, etc.)
  NOW(),
  NOW()
)
ON CONFLICT ("clerkId") DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  "updatedAt" = NOW();

-- Verify the user was created
SELECT * FROM "AppUser" WHERE "clerkId" = 'user_328ncCGDqfKdeM93XJAtxIwUO95';

