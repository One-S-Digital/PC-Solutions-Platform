# Database Migration Setup

This document explains how database migrations are configured to run during the build and deployment process.

## Overview

The application uses Prisma for database management and migrations. Migrations are configured to run automatically during different deployment scenarios to ensure the database schema is always up-to-date.

## Migration Scripts

### 1. `api/scripts/start-with-migration.sh`
- **Purpose**: Runs migrations before starting the application
- **Usage**: Docker containers and local development
- **Features**:
  - Waits for database connection
  - Runs `prisma migrate deploy`
  - Starts the application with `pnpm start:prod`

### 2. `api/scripts/render-migrate.sh`
- **Purpose**: Runs migrations during Render deployment build
- **Usage**: Render.com deployment
- **Features**:
  - Generates Prisma client
  - Checks migration status
  - Runs `prisma migrate deploy`
  - Verifies database connection

### 3. `api/scripts/prebuild-db-setup.sh`
- **Purpose**: Pre-build database setup for various environments
- **Usage**: Build processes where database might be available
- **Features**:
  - Checks for DATABASE_URL
  - Waits for database connection
  - Runs migrations if database is available

## Package.json Scripts

### API Scripts
```json
{
  "prebuild": "rimraf dist && ./scripts/prebuild-db-setup.sh",
  "build:with-migration": "prisma migrate deploy && nest build",
  "prebuild:migrate": "prisma migrate deploy"
}
```

## Deployment Configurations

### 1. Docker (Dockerfile.api)
```dockerfile
# Generate Prisma client during build
RUN cd api && pnpm prisma generate

# Build the application
RUN pnpm build

# Start with migration
CMD ["bash", "api/scripts/start-with-migration.sh"]
```

### 2. Render.com (render.yaml)
```yaml
buildCommand: cd api && pnpm install && bash scripts/render-migrate.sh && pnpm run build
startCommand: cd api && pnpm run start:prod
```

### 3. Local Development
```bash
# Run migrations manually
cd api && pnpm prisma migrate dev

# Or use the prebuild script
cd api && pnpm run prebuild:migrate
```

## Migration Process Flow

### Build Time
1. **Dependencies Installation**: `pnpm install`
2. **Prisma Client Generation**: `prisma generate`
3. **Migration Execution**: `prisma migrate deploy`
4. **Application Build**: `nest build`

### Runtime
1. **Database Connection Check**: Wait for database to be available
2. **Migration Status Check**: Verify migrations are up-to-date
3. **Application Start**: Start the NestJS application

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string

### Optional
- `NODE_ENV`: Environment (production, development, test)
- `PORT`: Application port (default: 3000)

## Troubleshooting

### Common Issues

1. **"The column `isActive` does not exist"**
   - **Cause**: Migration not applied to database
   - **Solution**: Run `prisma migrate deploy` or redeploy the application

2. **"Database connection failed"**
   - **Cause**: DATABASE_URL not set or database not available
   - **Solution**: Check DATABASE_URL and ensure database is running

3. **"Migration failed"**
   - **Cause**: Database schema conflicts or migration errors
   - **Solution**: Check migration files and resolve conflicts

### Debug Commands

```bash
# Check migration status
cd api && npx prisma migrate status

# Check database connection
cd api && npx prisma db execute --stdin <<< "SELECT 1;"

# View migration history
cd api && npx prisma migrate status --verbose

# Reset database (development only)
cd api && npx prisma migrate reset
```

## Best Practices

1. **Always test migrations locally** before deploying
2. **Use `prisma migrate dev`** for development
3. **Use `prisma migrate deploy`** for production
4. **Backup database** before running migrations in production
5. **Monitor migration logs** during deployment

## File Structure

```
api/
├── scripts/
│   ├── start-with-migration.sh    # Runtime migration script
│   ├── render-migrate.sh          # Render deployment script
│   └── prebuild-db-setup.sh       # Pre-build script
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration files
└── package.json                   # Build scripts
```

## Security Notes

- Migration scripts run with database credentials
- Ensure DATABASE_URL is properly secured
- Use environment variables for sensitive data
- Consider using read-only database users for migration checks