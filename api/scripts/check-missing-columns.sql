-- Quick check for all users table columns from Prisma schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns from schema:
-- id, clerkId, email, firstName, lastName, role
-- phoneNumber, workExperience, education, certifications, skills, availability, cvUrl
-- stripeCustomerId
-- lastActiveAt, isActive
-- createdAt, updatedAt
