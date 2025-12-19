/**
 * Simple DeepL test script (no TypeScript compilation needed)
 * Run with: node scripts/test-deepl-simple.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function testDeepL() {
  console.log('🔍 Testing DeepL Configuration...\n');

  const apiKey = process.env.DEEPL_API_KEY;
  
  console.log('📋 Configuration:');
  console.log(`   API Key Present: ${apiKey ? '✅ Yes' : '❌ No'}`);
  
  if (!apiKey) {
    console.log('\n❌ DEEPL_API_KEY is not set in environment variables.');
    console.log('   Please set it in your .env file: DEEPL_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log(`   API Key Length: ${apiKey.length} characters`);
  console.log(`   API Key Preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  // Try to import and test DeepL
  try {
    console.log('\n📦 Checking deepl-node package...');
    const deepl = require('deepl-node');
    console.log('   ✅ deepl-node package found');

    console.log('\n🔧 Initializing DeepL Translator...');
    const translator = new deepl.Translator(apiKey);
    console.log('   ✅ Translator instance created');

    console.log('\n🧪 Testing Translation...');
    const testText = 'Hello, world!';
    console.log(`   Source (EN): "${testText}"`);
    
    try {
      const result = await translator.translateText(testText, 'EN', 'FR');
      console.log(`   ✅ French Translation: "${result.text}"`);
      
      const resultDE = await translator.translateText(testText, 'EN', 'DE');
      console.log(`   ✅ German Translation: "${resultDE.text}"`);
      
      console.log('\n✅ DeepL is working correctly!');
      console.log('\n💡 If translations are not working in your app:');
      console.log('   1. Check backend logs for DeepL initialization messages');
      console.log('   2. Verify the backend is using the same .env file');
      console.log('   3. Restart the backend server after setting DEEPL_API_KEY');
      console.log('   4. Check the diagnostic endpoint: GET /api/translation/diagnostics/deepl');
    } catch (translationError) {
      console.log(`   ❌ Translation failed: ${translationError.message}`);
      if (translationError.message.includes('401') || translationError.message.includes('403')) {
        console.log('   ⚠️  This usually means the API key is invalid or expired');
        console.log('   → Check your DeepL account at https://deepl.com');
      } else if (translationError.message.includes('429')) {
        console.log('   ⚠️  Rate limit exceeded. Wait a moment and try again.');
      } else {
        console.log('   → Full error:', translationError);
      }
      process.exit(1);
    }
  } catch (importError) {
    console.log('   ❌ Failed to import deepl-node package');
    console.log(`   Error: ${importError.message}`);
    console.log('\n💡 To install deepl-node:');
    console.log('   cd api');
    console.log('   pnpm install deepl-node');
    console.log('   (or npm install deepl-node)');
    process.exit(1);
  }
}

testDeepL().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

