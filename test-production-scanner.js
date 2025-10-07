const ProductionVisualI18nScanner = require('./production-visual-scanner');

async function testProductionScanner() {
  console.log('🧪 Testing Production Visual i18n Scanner...');
  
  const scanner = new ProductionVisualI18nScanner({
    baseUrl: 'https://pc-solutions-frontend.onrender.com',
    headless: true, // Use headless for testing
    slowMo: 500,    // Faster for testing
    waitTime: 3000, // Wait 3 seconds for each page
    timeout: 15000  // 15 second timeout
  });
  
  try {
    await scanner.init();
    
    // Test with just a few pages first
    const testPages = [
      { url: '/', name: 'Home' },
      { url: '/login', name: 'Login' }
    ];
    
    console.log(`\n🔍 Testing with ${testPages.length} pages...`);
    
    for (const page of testPages) {
      const fullUrl = `${scanner.baseUrl}${page.url}`;
      await scanner.scanPage(fullUrl, page.name);
    }
    
    await scanner.generateReport();
    
    console.log('\n✅ Production scanner test completed!');
    console.log('📁 Check the generated reports:');
    console.log('   - production-visual-i18n-report.json');
    console.log('   - production-visual-i18n-report.html');
    console.log('   - production-i18n-screenshots/');
    
  } catch (error) {
    console.error('❌ Production test failed:', error);
  } finally {
    await scanner.cleanup();
  }
}

// Run the test
testProductionScanner().catch(console.error);