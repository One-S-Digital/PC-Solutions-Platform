# Message File URL Migration Script

This script migrates existing message file URLs from full public URLs to secure storage keys.

## Security Issue

Previously, the messaging system stored full public URLs (e.g., `https://assets.procrechesolutions.com/messages/...`) directly in the database. This exposed:
- Internal storage infrastructure details
- Direct access paths that could bypass authentication
- Full URLs in API responses

## Solution

The messaging service now:
1. **Stores only storage keys** (e.g., `messages/15fd8f8f-3c33-480c-b693-976aad7cd5cc/file.pdf`)
2. **Converts to secure URLs** when retrieving messages (e.g., `/api/upload/download/messages/...`)
3. **Requires authentication** through the download endpoint

## Migration Script

The migration script updates existing messages in the database to use storage keys instead of full URLs.

### Usage

#### Dry Run (Recommended First)
```bash
# See what will be migrated without making changes
pnpm run db:migrate:message-urls
```

#### Execute Migration
```bash
# Apply the migration to the database
pnpm run db:migrate:message-urls:execute
```

Or directly:
```bash
# Dry run
ts-node scripts/migrate-message-file-urls.ts

# Execute
ts-node scripts/migrate-message-file-urls.ts --execute
```

### What It Does

1. **Finds all messages** with `fileUrl` that contains full URLs (starting with `http://` or `https://`)
2. **Extracts storage keys** from those URLs
3. **Updates the database** to store only the storage key
4. **Provides detailed logging** of the migration process

### Example

**Before:**
```
fileUrl: "https://assets.procrechesolutions.com/messages/15fd8f8f-3c33-480c-b693-976aad7cd5cc/file.pdf"
```

**After:**
```
fileUrl: "messages/15fd8f8f-3c33-480c-b693-976aad7cd5cc/file.pdf"
```

When the message is retrieved, the service automatically converts it to:
```
fileUrl: "/api/upload/download/messages/15fd8f8f-3c33-480c-b693-976aad7cd5cc/file.pdf"
```

### Safety Features

- **Dry run by default**: No changes are made unless `--execute` flag is used
- **Error handling**: Continues processing even if individual messages fail
- **Detailed logging**: Shows exactly what will be changed
- **Progress tracking**: Reports success/error counts

### Requirements

- Database connection via `DATABASE_URL` environment variable
- Prisma client generated (`pnpm prisma generate`)
- Access to the `Message` table

### Notes

- The migration is **idempotent**: Safe to run multiple times
- Messages that already have storage keys or secure URLs are skipped
- The messaging service automatically handles conversion for new messages going forward

