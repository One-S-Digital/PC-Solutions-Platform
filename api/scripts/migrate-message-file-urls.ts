import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract storage key from a full URL or return the key if it's already a key
 * Handles URLs like: https://assets.procrechesolutions.com/messages/... or /api/upload/download/...
 * Returns the storage key portion
 */
function extractStorageKey(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  
  // If it's already a relative download URL, extract the key
  if (fileUrl.startsWith('/api/upload/download/')) {
    return fileUrl.replace('/api/upload/download/', '');
  }
  
  // If it's a full URL, extract the path after the domain
  try {
    const url = new URL(fileUrl);
    // Remove leading slash and return the path
    return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
  } catch {
    // If it's not a valid URL, assume it's already a storage key
    return fileUrl;
  }
}

/**
 * Check if a fileUrl is a full URL that needs to be migrated
 */
function needsMigration(fileUrl: string | null | undefined): boolean {
  if (!fileUrl) return false;
  
  // Check if it's a full URL (starts with http:// or https://)
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return true;
  }
  
  // If it's already a secure download URL, it doesn't need migration
  if (fileUrl.startsWith('/api/upload/download/')) {
    return false;
  }
  
  // If it's already just a storage key (no http/https, no /api/), it's fine
  return false;
}

async function migrateMessageFileUrls(dryRun: boolean = true) {
  console.log(`🔍 Starting migration of message file URLs (dry-run: ${dryRun})...`);
  console.log('');

  try {
    // Find all messages with fileUrl (using pagination to avoid memory issues)
    const batchSize = 1000;
    let skip = 0;
    let allMessages = [];
    
    console.log('📊 Fetching messages with fileUrl in batches...');
    
    while (true) {
      const batch = await prisma.message.findMany({
        where: {
          fileUrl: {
            not: null,
          },
        },
        select: {
          id: true,
          fileUrl: true,
          fileName: true,
          messageType: true,
          createdAt: true,
        },
        take: batchSize,
        skip: skip,
      });
      
      if (batch.length === 0) break;
      allMessages.push(...batch);
      skip += batchSize;
      
      if (skip % 5000 === 0) {
        console.log(`   Fetched ${skip} messages so far...`);
      }
    }
    
    const messages = allMessages;

    console.log(`📊 Found ${messages.length} messages with fileUrl`);
    console.log('');

    // Filter messages that need migration
    const messagesToMigrate = messages.filter(msg => needsMigration(msg.fileUrl));

    console.log(`🔧 ${messagesToMigrate.length} messages need migration`);
    console.log('');

    if (messagesToMigrate.length === 0) {
      console.log('✅ No messages need migration. All file URLs are already secure!');
      return;
    }

    // Show sample of messages that will be migrated
    console.log('📋 Sample of messages to migrate:');
    messagesToMigrate.slice(0, 5).forEach((msg, index) => {
      const storageKey = extractStorageKey(msg.fileUrl);
      console.log(`  ${index + 1}. Message ID: ${msg.id}`);
      console.log(`     Current URL: ${msg.fileUrl}`);
      console.log(`     Will become: ${storageKey}`);
      console.log(`     Secure URL: /api/upload/download/${storageKey}`);
      console.log('');
    });

    if (messagesToMigrate.length > 5) {
      console.log(`     ... and ${messagesToMigrate.length - 5} more messages`);
      console.log('');
    }

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('   Run with --execute flag to apply changes');
      console.log('');
      return;
    }

    // Perform migration
    console.log('🚀 Starting migration...');
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const msg of messagesToMigrate) {
      try {
        const storageKey = extractStorageKey(msg.fileUrl);
        
        if (!storageKey) {
          console.warn(`⚠️  Message ${msg.id}: Could not extract storage key from: ${msg.fileUrl}`);
          errorCount++;
          errors.push({ id: msg.id, error: 'Could not extract storage key' });
          continue;
        }

        await prisma.message.update({
          where: { id: msg.id },
          data: { fileUrl: storageKey },
        });

        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`   ✅ Migrated ${successCount}/${messagesToMigrate.length} messages...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating message ${msg.id}:`, error instanceof Error ? error.message : String(error));
        errorCount++;
        errors.push({
          id: msg.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total processed: ${messagesToMigrate.length}`);
    console.log('');

    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   - Message ${err.id}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
      console.log('');
    }

    if (successCount > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('ℹ️  Note: The messaging service will now convert these storage keys');
      console.log('   to secure download URLs when messages are retrieved.');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode');
    console.log('   Add --execute flag to apply changes');
    console.log('');
  } else {
    console.log('⚠️  EXECUTE MODE - Changes will be applied to the database');
    console.log('');
  }

  try {
    await migrateMessageFileUrls(dryRun);
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

