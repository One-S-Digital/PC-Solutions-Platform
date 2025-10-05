const AdvancedVisualI18nScanner = require('./advanced-visual-i18n-scanner');

async function testVisualScanner() {
  console.log('🧪 Testing Visual i18n Scanner...');
  
  const scanner = new AdvancedVisualI18nScanner({
    baseUrl: 'http://localhost:3000',
    headless: false, // Set to true for headless mode
    slowMo: 1000,    // Slow down for better observation
    waitTime: 2000   // Wait 2 seconds for each page
  });
  
  try {
    await scanner.init();
    
    // Test with just a few pages first
    const testPages = [
      { url: '/', name: 'Home' },
      { url: '/login', name: 'Login' },
      { url: '/dashboard', name: 'Dashboard' }
    ];
    
    console.log(`\n🔍 Testing with ${testPages.length} pages...`);
    
    for (const page of testPages) {
      const fullUrl = `${scanner.baseUrl}${page.url}`;
      await scanner.scanPage(fullUrl, page.name);
    }
    
    await scanner.generateReport();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scanner.cleanup();
  }
}

// Run the test
testVisualScanner().catch(console.error);