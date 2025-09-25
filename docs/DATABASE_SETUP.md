# Database Setup Guide for PC Solutions V2

This guide covers the complete database setup process for both development and production (Render) environments.

## Prerequisites

1. PostgreSQL database
2. Database connection string (DATABASE_URL)
3. Proper permissions to create tables and run migrations

## Database Connection String Format

```
postgresql://username:password@host:port/database?schema=public
```

For Render's managed PostgreSQL:
```
postgresql://user:password@host.render.com/database_name?ssl=true
```

## Local Development Setup

### 1. Set Environment Variable

```bash
# Create .env file in /api directory
cd api
echo "DATABASE_URL=your-database-url-here" > .env
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Migrations

```bash
# Apply all migrations
npx prisma migrate deploy

# Or create a new migration (development only)
npx prisma migrate dev --name your_migration_name
```

### 4. Verify Setup

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to view data
npx prisma studio
```

## Production Setup (Render)

### 1. Environment Variables

In Render Dashboard, ensure these are set:
- `DATABASE_URL` - Connection string from your PostgreSQL database

### 2. Build Command

The build command in Render should be:
```bash
pnpm install --frozen-lockfile --prod=false && cd api && pnpm run prebuild && pnpm run build
```

This will:
1. Install dependencies
2. Run prebuild script (which runs migrations)
3. Build the application

### 3. Migration Files Structure

Ensure your repository includes:
```
api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── migration_lock.toml      # Required!
│       └── 20240101000000_init/
│           └── migration.sql
```

## Troubleshooting

### Error: "Migration failed"

1. **Check DATABASE_URL**
   ```bash
   # In Render shell
   echo $DATABASE_URL
   ```

2. **Test connection**
   ```bash
   npx prisma db execute --sql "SELECT 1"
   ```

3. **Check permissions**
   ```sql
   -- Your database user needs these permissions:
   GRANT CREATE, CONNECT ON DATABASE your_db TO your_user;
   GRANT ALL ON SCHEMA public TO your_user;
   ```

### Error: "migration_lock.toml not found"

This file is required and must be committed to your repository:
```toml
# prisma/migrations/migration_lock.toml
provider = "postgresql"
```

### Error: "The table `public.users` does not exist"

Migrations haven't run. In Render shell:
```bash
cd api
npx prisma migrate deploy
```

### Manual Table Creation (Emergency Only)

If migrations fail, you can manually create tables:

1. Connect to your database using DBeaver or psql
2. Run the SQL from `api/prisma/migrations/20240101000000_init/migration.sql`

## Verifying Database Setup

### Via API Health Check

```bash
curl https://your-app.onrender.com/api/health/database
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "tables": "initialized",
  "userCount": 0
}
```

### Via Database Query

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return ~50 tables including:
-- users, organizations, products, services, etc.
```

## Post-Setup Tasks

### 1. Create Admin User

Either:
- Set Clerk public metadata with role "SUPER_ADMIN"
- Or manually insert in database:

```sql
INSERT INTO users (id, "clerkId", email, "firstName", "lastName", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'your-clerk-id',
  'admin@example.com',
  'Admin',
  'User',
  'SUPER_ADMIN',
  NOW(),
  NOW()
);
```

### 2. Verify Admin Access

```bash
# Should return 200 with admin role
curl -H "Authorization: Bearer your-jwt-token" \
  https://your-app.onrender.com/api/admin/frontend-settings
```

## Migration Best Practices

1. **Always test migrations locally first**
2. **Never edit existing migrations** - create new ones
3. **Keep migration files in version control**
4. **Back up production database before major migrations**
5. **Use transactions for data migrations**

## Resetting Database (Development Only)

```bash
# Drop all tables and re-run migrations
npx prisma migrate reset

# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
# 4. Run seed scripts (if configured)
```