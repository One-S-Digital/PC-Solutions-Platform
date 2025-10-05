const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ProductionVisualI18nScanner {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.missingKeys = new Set();
    this.hardcodedText = new Set();
    this.scannedPages = [];
    this.baseUrl = options.baseUrl || process.env.PRODUCTION_URL || 'https://pc-solutions-frontend.onrender.com';
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 1000;
    this.waitTime = options.waitTime || 5000; // Longer wait for production
    this.auth = options.auth || null;
    this.timeout = options.timeout || 30000; // 30 second timeout for production
  }

  async init() {
    console.log('🚀 Starting Production Visual i18n Scanner...');
    console.log(`🌐 Scanning: ${this.baseUrl}`);
    
    this.browser = await chromium.launch({ 
      headless: this.headless,
      slowMo: this.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set longer timeouts for production
    this.page.setDefaultTimeout(this.timeout);
    this.page.setDefaultNavigationTimeout(this.timeout);
    
    // Set viewport for consistent screenshots
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Enable console logging to catch i18n errors
    this.page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('i18n')) {
        console.log('🔍 i18n Error detected:', msg.text());
      }
    });

    // Handle authentication if provided
    if (this.auth) {
      await this.handleAuthentication();
    }
  }

  async handleAuthentication() {
    if (this.auth.type === 'clerk') {
      console.log('🔐 Handling Clerk authentication...');
      // For Clerk, we might need to handle it differently in production
      // This would depend on your specific auth setup
    }
  }

  async scanPage(url, pageName, options = {}) {
    console.log(`\n📄 Scanning: ${pageName} (${url})`);
    
    try {
      // Navigate with retry logic for production
      let retries = 3;
      while (retries > 0) {
        try {
          await this.page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: this.timeout 
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`   ⚠️  Retry ${3 - retries}/3 for ${pageName}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Wait for content to load
      await this.page.waitForTimeout(this.waitTime);
      
      // Handle dynamic content loading
      await this.waitForDynamicContent();
      
      // Take screenshot for reference
      const screenshotPath = `./production-i18n-screenshots/${pageName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Scan for missing translation keys
      const missingKeys = await this.scanForMissingKeys();
      
      // Scan for hardcoded text
      const hardcodedText = await this.scanForHardcodedText();
      
      // Scan for i18n errors in console
      const i18nErrors = await this.scanForI18nErrors();
      
      // Check for translation loading issues
      const translationIssues = await this.checkTranslationLoading();
      
      // Store results
      this.scannedPages.push({
        url,
        pageName,
        missingKeys: missingKeys.length,
        hardcodedText: hardcodedText.length,
        i18nErrors: i18nErrors.length,
        translationIssues: translationIssues.length,
        screenshot: screenshotPath,
        status: 'success'
      });
      
      // Add to global sets
      missingKeys.forEach(item => this.missingKeys.add(JSON.stringify(item)));
      hardcodedText.forEach(item => this.hardcodedText.add(JSON.stringify(item)));
      
      console.log(`   ✅ Found ${missingKeys.length} missing keys, ${hardcodedText.length} hardcoded text items`);
      if (i18nErrors.length > 0) {
        console.log(`   ⚠️  Found ${i18nErrors.length} i18n errors`);
      }
      if (translationIssues.length > 0) {
        console.log(`   ⚠️  Found ${translationIssues.length} translation loading issues`);
      }
      
      return { missingKeys, hardcodedText, i18nErrors, translationIssues };
      
    } catch (error) {
      console.error(`   ❌ Error scanning ${pageName}:`, error.message);
      
      this.scannedPages.push({
        url,
        pageName,
        missingKeys: 0,
        hardcodedText: 0,
        i18nErrors: 0,
        translationIssues: 0,
        screenshot: null,
        status: 'error',
        error: error.message
      });
      
      return { missingKeys: [], hardcodedText: [], i18nErrors: [], translationIssues: [] };
    }
  }

  async waitForDynamicContent() {
    // Wait for common dynamic content indicators
    try {
      // Wait for any loading spinners to disappear
      await this.page.waitForFunction(() => {
        const spinners = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner, [class*="loading"]');
        return spinners.length === 0;
      }, { timeout: 10000 });
    } catch (e) {
      // Ignore timeout errors
    }

    // Wait for any lazy-loaded content
    try {
      await this.page.waitForFunction(() => {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        return Array.from(lazyImages).every(img => img.complete);
      }, { timeout: 10000 });
    } catch (e) {
      // Ignore timeout errors
    }

    // Wait for React to finish rendering
    try {
      await this.page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 5000 });
    } catch (e) {
      // Ignore timeout errors
    }
  }

  async scanForMissingKeys() {
    return await this.page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        
        // Enhanced patterns for missing translation keys
        const patterns = [
          /^[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z0-9_.]+$/, // common.save, dashboard.title
          /^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z0-9_.]+$/, // common:save, dashboard:title
          /^[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_]+$/, // common_save, dashboard_title
          /^[a-zA-Z][a-zA-Z0-9]*\[[a-zA-Z0-9_.]+\]$/, // common[save], dashboard[title]
          /^[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+$/, // nested keys
        ];
        
        const isMissingKey = patterns.some(pattern => pattern.test(text));
        
        if (isMissingKey) {
          results.push({
            type: 'missing_key',
            text: text,
            element: node.parentElement?.tagName || 'unknown',
            className: node.parentElement?.className || '',
            id: node.parentElement?.id || ''
          });
        }
      }
      
      return results;
    });
  }

  async scanForHardcodedText() {
    return await this.page.evaluate(() => {
      const results = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        
        // Skip empty text, numbers, and very short text
        if (!text || text.length < 3 || /^[0-9.,:;!?%+*/<>=(){}[\]_'"`-]+$/.test(text)) {
          continue;
        }
        
        // Skip if it's inside a script or style tag
        if (node.parentElement?.tagName === 'SCRIPT' || node.parentElement?.tagName === 'STYLE') {
          continue;
        }
        
        // Skip if it's a translation key (already handled by missing keys)
        if (/^[a-zA-Z][a-zA-Z0-9]*[.:_][a-zA-Z0-9_.]+$/.test(text)) {
          continue;
        }
        
        // Enhanced UI text detection
        const uiKeywords = [
          'save', 'cancel', 'delete', 'edit', 'add', 'remove', 'create', 'update',
          'submit', 'confirm', 'back', 'next', 'previous', 'continue', 'finish',
          'loading', 'error', 'success', 'warning', 'info', 'help', 'search',
          'filter', 'sort', 'view', 'hide', 'show', 'close', 'open', 'select',
          'choose', 'upload', 'download', 'print', 'share', 'copy', 'paste',
          'cut', 'undo', 'redo', 'refresh', 'reload', 'restart', 'stop', 'start',
          'pause', 'play', 'resume', 'skip', 'jump', 'go', 'enter', 'exit',
          'login', 'logout', 'register', 'signup', 'signin', 'forgot', 'reset',
          'password', 'username', 'email', 'phone', 'address', 'name', 'title',
          'description', 'message', 'notification', 'alert', 'dialog', 'modal',
          'popup', 'tooltip', 'hint', 'tip', 'note', 'comment', 'reply',
          'like', 'dislike', 'vote', 'rate', 'review', 'feedback', 'report',
          'block', 'unblock', 'follow', 'unfollow', 'subscribe', 'unsubscribe',
          'settings', 'preferences', 'options', 'configuration', 'profile',
          'account', 'dashboard', 'home', 'about', 'contact', 'support',
          'privacy', 'terms', 'conditions', 'policy', 'agreement', 'license',
          'welcome', 'hello', 'goodbye', 'thank you', 'please', 'sorry',
          'yes', 'no', 'ok', 'okay', 'sure', 'maybe', 'perhaps', 'definitely',
          'absolutely', 'exactly', 'precisely', 'correct', 'incorrect', 'wrong',
          'right', 'left', 'up', 'down', 'top', 'bottom', 'middle', 'center',
          'begin', 'end', 'start', 'stop', 'pause', 'resume', 'complete',
          'finished', 'done', 'ready', 'prepared', 'available', 'unavailable',
          'enabled', 'disabled', 'active', 'inactive', 'online', 'offline',
          'public', 'private', 'shared', 'personal', 'general', 'specific',
          'custom', 'default', 'standard', 'basic', 'advanced', 'expert',
          'beginner', 'intermediate', 'professional', 'amateur', 'novice'
        ];
        
        const lowerText = text.toLowerCase();
        const hasUIKeyword = uiKeywords.some(keyword => lowerText.includes(keyword));
        
        // Check if it looks like user-facing text
        const isLikelyUIText = hasUIKeyword || 
          (text.length > 3 && text.length < 200 && 
           /^[A-Za-z\s.,!?;:'"()-]+$/.test(text) &&
           !text.includes('http') && 
           !text.includes('@') &&
           !text.includes('#') &&
           !text.match(/^[0-9]+$/) &&
           !text.match(/^[A-Z_]+$/)); // Skip constants like ERROR_CODE
        
        if (isLikelyUIText) {
          results.push({
            type: 'hardcoded_text',
            text: text,
            element: node.parentElement?.tagName || 'unknown',
            className: node.parentElement?.className || '',
            id: node.parentElement?.id || '',
            context: node.parentElement?.textContent?.substring(0, 200) || '',
            xpath: this.getXPath(node.parentElement)
          });
        }
      }
      
      return results;
    });
  }

  async scanForI18nErrors() {
    return await this.page.evaluate(() => {
      // This would need to be implemented based on your i18n setup
      // For now, we'll return empty array
      return [];
    });
  }

  async checkTranslationLoading() {
    return await this.page.evaluate(() => {
      const issues = [];
      
      // Check if i18n is properly initialized
      if (typeof window.i18n === 'undefined') {
        issues.push({
          type: 'i18n_not_initialized',
          message: 'i18n not found on window object'
        });
      }
      
      // Check for missing translation files
      const missingTranslations = [];
      const requiredLanguages = ['en', 'fr', 'de'];
      
      requiredLanguages.forEach(lang => {
        if (!window.i18n?.hasResourceBundle?.(lang, 'translation')) {
          missingTranslations.push(lang);
        }
      });
      
      if (missingTranslations.length > 0) {
        issues.push({
          type: 'missing_translation_files',
          message: `Missing translation files for: ${missingTranslations.join(', ')}`,
          languages: missingTranslations
        });
      }
      
      return issues;
    });
  }

  async scanAllPages() {
    // Create screenshots directory
    if (!fs.existsSync('./production-i18n-screenshots')) {
      fs.mkdirSync('./production-i18n-screenshots');
    }

    // Define pages to scan - customize this based on your app
    const pagesToScan = [
      { url: '/', name: 'Home' },
      { url: '/login', name: 'Login' },
      { url: '/register', name: 'Register' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/profile', name: 'Profile' },
      { url: '/settings', name: 'Settings' },
      { url: '/messages', name: 'Messages' },
      { url: '/notifications', name: 'Notifications' },
      { url: '/orders', name: 'Orders' },
      { url: '/services', name: 'Services' },
      { url: '/content', name: 'Content' },
      { url: '/suppliers', name: 'Suppliers' },
      { url: '/daycares', name: 'Daycares' },
      { url: '/admin', name: 'Admin' },
      { url: '/help', name: 'Help' },
      { url: '/about', name: 'About' },
      { url: '/contact', name: 'Contact' }
    ];

    console.log(`\n🔍 Scanning ${pagesToScan.length} pages on production...`);
    
    for (const page of pagesToScan) {
      const fullUrl = `${this.baseUrl}${page.url}`;
      await this.scanPage(fullUrl, page.name);
      
      // Add delay between requests to be respectful to production
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Production Visual i18n Report...');
    
    const missingKeysArray = Array.from(this.missingKeys).map(item => JSON.parse(item));
    const hardcodedTextArray = Array.from(this.hardcodedText).map(item => JSON.parse(item));
    
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: this.baseUrl,
      environment: 'production',
      summary: {
        totalPagesScanned: this.scannedPages.length,
        successfulScans: this.scannedPages.filter(p => p.status === 'success').length,
        failedScans: this.scannedPages.filter(p => p.status === 'error').length,
        totalMissingKeys: missingKeysArray.length,
        totalHardcodedText: hardcodedTextArray.length,
        pagesWithIssues: this.scannedPages.filter(p => p.missingKeys > 0 || p.hardcodedText > 0).length
      },
      pages: this.scannedPages,
      missingKeys: missingKeysArray,
      hardcodedText: hardcodedTextArray,
      recommendations: this.generateRecommendations(missingKeysArray, hardcodedTextArray)
    };
    
    // Save detailed report
    fs.writeFileSync('./production-visual-i18n-report.json', JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRODUCTION VISUAL i18n SCAN RESULTS');
    console.log('='.repeat(60));
    console.log(`🌐 Environment: Production (${this.baseUrl})`);
    console.log(`📄 Pages scanned: ${report.summary.totalPagesScanned}`);
    console.log(`✅ Successful scans: ${report.summary.successfulScans}`);
    console.log(`❌ Failed scans: ${report.summary.failedScans}`);
    console.log(`🔑 Missing keys found: ${report.summary.totalMissingKeys}`);
    console.log(`📝 Hardcoded text found: ${report.summary.totalHardcodedText}`);
    console.log(`⚠️  Pages with issues: ${report.summary.pagesWithIssues}`);
    console.log('\n📁 Reports saved:');
    console.log('   - production-visual-i18n-report.json (detailed JSON)');
    console.log('   - production-visual-i18n-report.html (visual HTML report)');
    console.log('   - production-i18n-screenshots/ (page screenshots)');
    
    if (missingKeysArray.length > 0) {
      console.log('\n🔑 MISSING KEYS FOUND:');
      missingKeysArray.slice(0, 10).forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.text}" (${item.element})`);
      });
      if (missingKeysArray.length > 10) {
        console.log(`   ... and ${missingKeysArray.length - 10} more`);
      }
    }
    
    if (hardcodedTextArray.length > 0) {
      console.log('\n📝 HARDCODED TEXT FOUND:');
      hardcodedTextArray.slice(0, 10).forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.text}" (${item.element})`);
      });
      if (hardcodedTextArray.length > 10) {
        console.log(`   ... and ${hardcodedTextArray.length - 10} more`);
      }
    }
  }

  generateRecommendations(missingKeys, hardcodedText) {
    const recommendations = [];
    
    if (missingKeys.length > 0) {
      recommendations.push({
        type: 'missing_keys',
        priority: 'high',
        message: `Found ${missingKeys.length} missing translation keys in production. These need to be added to your locale files.`,
        action: 'Add the missing keys to your translation files and redeploy'
      });
    }
    
    if (hardcodedText.length > 0) {
      recommendations.push({
        type: 'hardcoded_text',
        priority: 'medium',
        message: `Found ${hardcodedText.length} pieces of hardcoded text that should be translated.`,
        action: 'Replace hardcoded text with translation keys and redeploy'
      });
    }
    
    if (missingKeys.length === 0 && hardcodedText.length === 0) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        message: 'No i18n issues found in production! Your application appears to be properly internationalized.',
        action: 'Continue monitoring with regular scans'
      });
    }
    
    return recommendations;
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production Visual i18n Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; color: #007bff; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .issue-item { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .issue-item.missing-key { border-left: 4px solid #dc3545; }
        .issue-item.hardcoded-text { border-left: 4px solid #ffc107; }
        .issue-text { font-weight: bold; color: #333; margin-bottom: 5px; }
        .issue-details { color: #666; font-size: 0.9em; }
        .page-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .page-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        .page-card.error { border-left: 4px solid #dc3545; }
        .page-card.success { border-left: 4px solid #28a745; }
        .page-card h4 { margin: 0 0 10px 0; color: #333; }
        .page-stats { display: flex; justify-content: space-between; font-size: 0.9em; color: #666; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .recommendation { margin-bottom: 15px; padding: 10px; background: white; border-radius: 6px; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Production Visual i18n Scan Report</h1>
            <p>Generated on ${new Date(report.generatedAt).toLocaleString()}</p>
            <p>Environment: ${report.environment.toUpperCase()} | URL: ${report.baseUrl}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Pages Scanned</h3>
                <div class="number">${report.summary.totalPagesScanned}</div>
            </div>
            <div class="summary-card">
                <h3>Successful</h3>
                <div class="number">${report.summary.successfulScans}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number">${report.summary.failedScans}</div>
            </div>
            <div class="summary-card">
                <h3>Missing Keys</h3>
                <div class="number">${report.summary.totalMissingKeys}</div>
            </div>
            <div class="summary-card">
                <h3>Hardcoded Text</h3>
                <div class="number">${report.summary.totalHardcodedText}</div>
            </div>
            <div class="summary-card">
                <h3>Pages with Issues</h3>
                <div class="number">${report.summary.pagesWithIssues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📄 Page Summary</h2>
            <div class="page-grid">
                ${report.pages.map(page => `
                    <div class="page-card ${page.status}">
                        <h4>${page.pageName}</h4>
                        <div class="page-stats">
                            <span>Missing Keys: ${page.missingKeys}</span>
                            <span>Hardcoded: ${page.hardcodedText}</span>
                        </div>
                        <p><small>URL: ${page.url}</small></p>
                        ${page.status === 'error' ? `<p><small style="color: #dc3545;">Error: ${page.error}</small></p>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${report.missingKeys.length > 0 ? `
        <div class="section">
            <h2>🔑 Missing Translation Keys</h2>
            ${report.missingKeys.map(item => `
                <div class="issue-item missing-key">
                    <div class="issue-text">"${item.text}"</div>
                    <div class="issue-details">
                        Element: ${item.element} | 
                        Class: ${item.className || 'none'} | 
                        ID: ${item.id || 'none'}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${report.hardcodedText.length > 0 ? `
        <div class="section">
            <h2>📝 Hardcoded Text</h2>
            ${report.hardcodedText.map(item => `
                <div class="issue-item hardcoded-text">
                    <div class="issue-text">"${item.text}"</div>
                    <div class="issue-details">
                        Element: ${item.element} | 
                        Class: ${item.className || 'none'} | 
                        ID: ${item.id || 'none'}
                    </div>
                    <div class="issue-details" style="margin-top: 5px;">
                        Context: ${item.context}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>${rec.message}</strong>
                        <p>${rec.action}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('./production-visual-i18n-report.html', html);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const options = {
    baseUrl: process.env.PRODUCTION_URL || 'https://pc-solutions-frontend.onrender.com',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 1000,
    waitTime: parseInt(process.env.WAIT_TIME) || 5000,
    timeout: parseInt(process.env.TIMEOUT) || 30000
  };
  
  const scanner = new ProductionVisualI18nScanner(options);
  
  try {
    await scanner.init();
    await scanner.scanAllPages();
    await scanner.generateReport();
  } catch (error) {
    console.error('❌ Production scanner failed:', error);
  } finally {
    await scanner.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionVisualI18nScanner;