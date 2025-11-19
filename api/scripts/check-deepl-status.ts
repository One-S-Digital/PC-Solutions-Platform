/**
 * Script to check DeepL service status and configuration
 * Run with: ts-node scripts/check-deepl-status.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DeepLService } from '../src/translation/deepl.service';
import { ConfigService } from '@nestjs/config';

async function checkDeepLStatus() {
  console.log('🔍 Checking DeepL Service Status...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get(ConfigService);
    const deepLService = app.get(DeepLService);

    // Check API key
    const apiKey = configService.get<string>('DEEPL_API_KEY');
    const hasApiKey = !!apiKey;

    console.log('📋 Configuration:');
    console.log(`   API Key Present: ${hasApiKey ? '✅ Yes' : '❌ No'}`);
    if (hasApiKey) {
      console.log(`   API Key Length: ${apiKey.length} characters`);
      console.log(`   API Key Preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      console.log('   ⚠️  DEEPL_API_KEY environment variable is not set');
    }

    console.log('\n🔧 Service Status:');
    
    // Wait for initialization
    const isAvailable = await deepLService.waitForInitialization();
    console.log(`   DeepL Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

    if (isAvailable) {
      console.log('\n🧪 Testing Translation:');
      try {
        const testText = 'Hello, world!';
        const translated = await deepLService.translate(testText, 'en', 'fr');
        console.log(`   ✅ Translation successful!`);
        console.log(`   Source (EN): "${testText}"`);
        console.log(`   Target (FR): "${translated}"`);
        
        // Test German
        const translatedDE = await deepLService.translate(testText, 'en', 'de');
        console.log(`   Target (DE): "${translatedDE}"`);
      } catch (error) {
        console.log(`   ❌ Translation test failed: ${error.message}`);
        console.log(`   Error details:`, error);
      }
    } else {
      console.log('\n⚠️  DeepL service is not available.');
      if (!hasApiKey) {
        console.log('   → Set DEEPL_API_KEY environment variable to enable DeepL');
      } else {
        console.log('   → Check backend logs for initialization errors');
        console.log('   → Verify deepl-node package is installed: npm list deepl-node');
        console.log('   → Verify API key is valid');
      }
    }

    await app.close();
    console.log('\n✅ Status check complete!');
  } catch (error) {
    console.error('❌ Error checking DeepL status:', error);
    process.exit(1);
  }
}

checkDeepLStatus();

