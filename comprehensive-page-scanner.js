const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ComprehensivePageScanner {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.missingKeys = new Set();
    this.hardcodedText = new Set();
    this.scannedPages = [];
    this.baseUrl = options.baseUrl || process.env.PRODUCTION_URL || 'https://app.procrechesolutions.com';
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 1000;
    this.waitTime = options.waitTime || 5000;
    this.timeout = options.timeout || 30000;
    this.isAuthenticated = false;
    this.allDiscoveredPages = new Set();
  }

  async init() {
    console.log('🚀 Starting Comprehensive Page Scanner...');
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
  }

  async discoverAllPages() {
    console.log('\n🔍 Discovering all pages in the application...');
    
    const discoveredPages = new Set();
    
    // Start with known pages
    const knownPages = [
      '/',
      '/login',
      '/register',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/dashboard',
      '/profile',
      '/settings',
      '/account',
      '/billing',
      '/subscription',
      '/pricing',
      '/plans',
      '/find-creche',
      '/find-daycare',
      '/search',
      '/search-results',
      '/messages',
      '/notifications',
      '/orders',
      '/order-history',
      '/services',
      '/my-services',
      '/content',
      '/e-learning',
      '/hr-policies',
      '/state-policies',
      '/suppliers',
      '/my-suppliers',
      '/daycares',
      '/my-daycares',
      '/admin',
      '/admin/users',
      '/admin/settings',
      '/admin/dashboard',
      '/help',
      '/support',
      '/faq',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/legal',
      '/blog',
      '/news',
      '/careers',
      '/partners',
      '/api-docs',
      '/status',
      '/maintenance',
      '/404',
      '/500',
      '/error'
    ];

    // Add all known pages
    knownPages.forEach(page => {
      discoveredPages.add(page);
    });

    // Try to discover more pages by following links
    try {
      await this.page.goto(`${this.baseUrl}/`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);

      // Find all internal links
      const links = await this.page.evaluate(() => {
        const linkElements = document.querySelectorAll('a[href]');
        const links = [];
        
        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            // Clean up the href
            let cleanHref = href;
            if (cleanHref.startsWith('/')) {
              cleanHref = cleanHref;
            } else if (cleanHref.startsWith('./')) {
              cleanHref = '/' + cleanHref.substring(2);
            } else if (!cleanHref.startsWith('#')) {
              cleanHref = '/' + cleanHref;
            }
            
            // Remove hash fragments and query params for now
            cleanHref = cleanHref.split('#')[0].split('?')[0];
            
            if (cleanHref && cleanHref !== '/' && !cleanHref.includes('..')) {
              links.push(cleanHref);
            }
          }
        });
        
        return [...new Set(links)]; // Remove duplicates
      });

      // Add discovered links
      links.forEach(link => {
        if (link && link.length > 1) {
          discoveredPages.add(link);
        }
      });

      console.log(`   📄 Discovered ${links.length} additional pages from links`);
    } catch (error) {
      console.log(`   ⚠️  Could not discover additional pages: ${error.message}`);
    }

    // Add common dashboard sub-pages
    const dashboardPages = [
      '/dashboard/overview',
      '/dashboard/analytics',
      '/dashboard/reports',
      '/dashboard/notifications',
      '/dashboard/messages',
      '/dashboard/orders',
      '/dashboard/services',
      '/dashboard/content',
      '/dashboard/suppliers',
      '/dashboard/daycares',
      '/dashboard/settings',
      '/dashboard/profile',
      '/dashboard/billing',
      '/dashboard/subscription',
      '/dashboard/help',
      '/dashboard/support'
    ];

    dashboardPages.forEach(page => {
      discoveredPages.add(page);
    });

    // Add common form pages
    const formPages = [
      '/forms/contact',
      '/forms/feedback',
      '/forms/support',
      '/forms/application',
      '/forms/registration',
      '/forms/profile-update',
      '/forms/service-request',
      '/forms/order-request',
      '/forms/content-upload',
      '/forms/supplier-application',
      '/forms/daycare-application'
    ];

    formPages.forEach(page => {
      discoveredPages.add(page);
    });

    this.allDiscoveredPages = discoveredPages;
    console.log(`   📊 Total pages to scan: ${discoveredPages.size}`);
    
    return Array.from(discoveredPages);
  }

  async authenticate() {
    console.log('🔐 Attempting to authenticate...');
    
    try {
      // Go to login page
      await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);
      
      // Look for email/username input
      const emailInput = await this.page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]').first();
      const passwordInput = await this.page.locator('input[type="password"], input[name="password"]').first();
      const loginButton = await this.page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Login")').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible() && await loginButton.isVisible()) {
        console.log('   📝 Found login form, attempting mock login...');
        
        // Use mock credentials
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        
        // Click login button
        await loginButton.click();
        
        // Wait for navigation or success
        await this.page.waitForTimeout(5000);
        
        // Check if we're redirected to dashboard or if login was successful
        const currentUrl = this.page.url();
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/profile') || !currentUrl.includes('/login')) {
          console.log('   ✅ Authentication successful!');
          this.isAuthenticated = true;
          return true;
        } else {
          console.log('   ⚠️  Authentication may have failed, but continuing...');
          return false;
        }
      } else {
        console.log('   ⚠️  Could not find login form elements');
        return false;
      }
    } catch (error) {
      console.log('   ❌ Authentication failed:', error.message);
      return false;
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
      const screenshotPath = `./comprehensive-screenshots/${pageName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
        status: 'success',
        authenticated: this.isAuthenticated
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
        error: error.message,
        authenticated: this.isAuthenticated
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
            id: node.parentElement?.id || '',
            context: node.parentElement?.textContent?.substring(0, 100) || ''
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
        if (!text || text.length < 2 || /^[0-9.,:;!?%+*/<>=(){}[\]_'"`-]+$/.test(text)) {
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
        
        // Skip very common non-translatable text
        const skipPatterns = [
          /^[0-9]+$/, // Pure numbers
          /^[A-Z_]+$/, // Constants like ERROR_CODE
          /^https?:\/\//, // URLs
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email addresses
          /^\+?[1-9]\d{1,14}$/, // Phone numbers
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, // Dates
          /^[0-9]{2}:[0-9]{2}$/, // Times
          /^[A-Z]{2,3}$/, // Country codes
          /^[0-9]+\.[0-9]+$/, // Decimal numbers
          /^[0-9]+%$/, // Percentages
          /^[0-9]+[a-zA-Z]$/, // Numbers with units
        ];
        
        if (skipPatterns.some(pattern => pattern.test(text))) {
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
          'beginner', 'intermediate', 'professional', 'amateur', 'novice',
          'orders', 'services', 'suppliers', 'daycares', 'messages', 'notifications',
          'content', 'admin', 'help', 'about', 'contact', 'dashboard', 'profile',
          'settings', 'logout', 'sign out', 'my account', 'my profile',
          'pricing', 'plans', 'subscription', 'billing', 'payment', 'invoice',
          'find', 'search', 'browse', 'explore', 'discover', 'learn', 'read',
          'watch', 'listen', 'play', 'game', 'quiz', 'test', 'exam', 'course',
          'lesson', 'tutorial', 'guide', 'manual', 'documentation', 'api',
          'developer', 'integration', 'webhook', 'sdk', 'library', 'framework',
          'crèche', 'daycare', 'nursery', 'kindergarten', 'preschool', 'childcare',
          'parent', 'guardian', 'family', 'child', 'baby', 'toddler', 'infant',
          'teacher', 'educator', 'staff', 'employee', 'manager', 'director',
          'owner', 'operator', 'provider', 'supplier', 'vendor', 'partner'
        ];
        
        const lowerText = text.toLowerCase();
        const hasUIKeyword = uiKeywords.some(keyword => lowerText.includes(keyword));
        
        // Check if it looks like user-facing text
        const isLikelyUIText = hasUIKeyword || 
          (text.length > 2 && text.length < 300 && 
           /^[A-Za-z\s.,!?;:'"()-]+$/.test(text) &&
           !text.includes('http') && 
           !text.includes('@') &&
           !text.includes('#') &&
           !text.match(/^[0-9]+$/) &&
           !text.match(/^[A-Z_]+$/) &&
           text.split(' ').length <= 10); // Not too long sentences
        
        if (isLikelyUIText) {
          results.push({
            type: 'hardcoded_text',
            text: text,
            element: node.parentElement?.tagName || 'unknown',
            className: node.parentElement?.className || '',
            id: node.parentElement?.id || '',
            context: node.parentElement?.textContent?.substring(0, 200) || ''
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
    if (!fs.existsSync('./comprehensive-screenshots')) {
      fs.mkdirSync('./comprehensive-screenshots');
    }

    // Discover all pages
    const allPages = await this.discoverAllPages();
    
    // Try to authenticate
    await this.authenticate();

    console.log(`\n🔍 Scanning ${allPages.length} pages comprehensively...`);
    
    for (const pagePath of allPages) {
      const fullUrl = `${this.baseUrl}${pagePath}`;
      const pageName = pagePath === '/' ? 'Home' : pagePath.substring(1).replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '_');
      
      await this.scanPage(fullUrl, pageName);
      
      // Add delay between requests to be respectful to production
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Comprehensive Page Scan Report...');
    
    const missingKeysArray = Array.from(this.missingKeys).map(item => JSON.parse(item));
    const hardcodedTextArray = Array.from(this.hardcodedText).map(item => JSON.parse(item));
    
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: this.baseUrl,
      environment: 'production',
      authenticated: this.isAuthenticated,
      totalPagesDiscovered: this.allDiscoveredPages.size,
      summary: {
        totalPagesScanned: this.scannedPages.length,
        successfulScans: this.scannedPages.filter(p => p.status === 'success').length,
        failedScans: this.scannedPages.filter(p => p.status === 'error').length,
        authenticatedScans: this.scannedPages.filter(p => p.authenticated).length,
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
    fs.writeFileSync('./comprehensive-page-scan-report.json', JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE PAGE SCAN RESULTS');
    console.log('='.repeat(80));
    console.log(`🌐 Environment: Production (${this.baseUrl})`);
    console.log(`🔐 Authenticated: ${this.isAuthenticated ? 'Yes' : 'No'}`);
    console.log(`📄 Pages discovered: ${report.totalPagesDiscovered}`);
    console.log(`📄 Pages scanned: ${report.summary.totalPagesScanned}`);
    console.log(`✅ Successful scans: ${report.summary.successfulScans}`);
    console.log(`❌ Failed scans: ${report.summary.failedScans}`);
    console.log(`🔑 Missing keys found: ${report.summary.totalMissingKeys}`);
    console.log(`📝 Hardcoded text found: ${report.summary.totalHardcodedText}`);
    console.log(`⚠️  Pages with issues: ${report.summary.pagesWithIssues}`);
    console.log('\n📁 Reports saved:');
    console.log('   - comprehensive-page-scan-report.json (detailed JSON)');
    console.log('   - comprehensive-page-scan-report.html (visual HTML report)');
    console.log('   - comprehensive-screenshots/ (page screenshots)');
    
    if (missingKeysArray.length > 0) {
      console.log('\n🔑 MISSING KEYS FOUND:');
      missingKeysArray.slice(0, 20).forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.text}" (${item.element}) - ${item.context}`);
      });
      if (missingKeysArray.length > 20) {
        console.log(`   ... and ${missingKeysArray.length - 20} more`);
      }
    }
    
    if (hardcodedTextArray.length > 0) {
      console.log('\n📝 HARDCODED TEXT FOUND:');
      hardcodedTextArray.slice(0, 20).forEach((item, i) => {
        console.log(`   ${i + 1}. "${item.text}" (${item.element})`);
      });
      if (hardcodedTextArray.length > 20) {
        console.log(`   ... and ${hardcodedTextArray.length - 20} more`);
      }
    }
  }

  generateRecommendations(missingKeys, hardcodedText) {
    const recommendations = [];
    
    if (missingKeys.length > 0) {
      recommendations.push({
        type: 'missing_keys',
        priority: 'high',
        message: `Found ${missingKeys.length} missing translation keys across all pages. These need to be added to your locale files.`,
        action: 'Add the missing keys to your translation files and redeploy'
      });
    }
    
    if (hardcodedText.length > 0) {
      recommendations.push({
        type: 'hardcoded_text',
        priority: 'high',
        message: `Found ${hardcodedText.length} pieces of hardcoded text across all pages that should be translated.`,
        action: 'Replace hardcoded text with translation keys and redeploy'
      });
    }
    
    if (missingKeys.length === 0 && hardcodedText.length === 0) {
      recommendations.push({
        type: 'success',
        priority: 'low',
        message: 'No i18n issues found across all pages! Your application appears to be properly internationalized.',
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
    <title>Comprehensive Page Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; border-radius: 8px; }
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
        .page-card.authenticated { border-left: 4px solid #17a2b8; }
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
            <h1>🔍 Comprehensive Page Scan Report</h1>
            <p>Generated on ${new Date(report.generatedAt).toLocaleString()}</p>
            <p>Environment: ${report.environment.toUpperCase()} | URL: ${report.baseUrl}</p>
            <p>Authentication: ${report.authenticated ? '✅ Success' : '❌ Failed'} | Pages Discovered: ${report.totalPagesDiscovered}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Pages Discovered</h3>
                <div class="number">${report.totalPagesDiscovered}</div>
            </div>
            <div class="summary-card">
                <h3>Pages Scanned</h3>
                <div class="number">${report.summary.totalPagesScanned}</div>
            </div>
            <div class="summary-card">
                <h3>Successful</h3>
                <div class="number">${report.summary.successfulScans}</div>
            </div>
            <div class="summary-card">
                <h3>Authenticated</h3>
                <div class="number">${report.summary.authenticatedScans}</div>
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
                    <div class="page-card ${page.status} ${page.authenticated ? 'authenticated' : ''}">
                        <h4>${page.pageName} ${page.authenticated ? '🔐' : ''}</h4>
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
                    <div class="issue-details" style="margin-top: 5px;">
                        Context: ${item.context}
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
    
    fs.writeFileSync('./comprehensive-page-scan-report.html', html);
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
    baseUrl: process.env.PRODUCTION_URL || 'https://app.procrechesolutions.com',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 1000,
    waitTime: parseInt(process.env.WAIT_TIME) || 5000,
    timeout: parseInt(process.env.TIMEOUT) || 30000
  };
  
  const scanner = new ComprehensivePageScanner(options);
  
  try {
    await scanner.init();
    await scanner.scanAllPages();
    await scanner.generateReport();
  } catch (error) {
    console.error('❌ Comprehensive scanner failed:', error);
  } finally {
    await scanner.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ComprehensivePageScanner;