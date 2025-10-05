// Simple test script to test translation error logging
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'api', 'logs', 'translation-errors');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a test log file
const testLog = {
  timestamp: new Date().toISOString(),
  language: 'en',
  totalErrors: 3,
  errors: [
    {
      key: 'buttons.missingKey',
      returned: 'buttons.missingKey',
      expected: 'Actual translated text',
      timestamp: new Date().toISOString(),
      language: 'en',
      page: '/test',
      severity: 'missing'
    },
    {
      key: 'dashboardPage.missingTitle',
      returned: 'dashboardPage.missingTitle',
      expected: 'Dashboard Title',
      timestamp: new Date().toISOString(),
      language: 'en',
      page: '/dashboard',
      severity: 'missing'
    },
    {
      key: 'navbar.missingItem',
      returned: 'navbar.missingItem',
      expected: 'Navigation Item',
      timestamp: new Date().toISOString(),
      language: 'en',
      page: '/navbar',
      severity: 'missing'
    }
  ],
  summary: {
    missingKeys: 3,
    fallbackKeys: 0,
    errorKeys: 0
  },
  userAgent: 'Test Script',
  url: 'http://localhost:3000/test',
  referrer: 'http://localhost:3000/'
};

// Write individual log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFileName = `translation-errors-en-${timestamp}.json`;
const logFilePath = path.join(logsDir, logFileName);
fs.writeFileSync(logFilePath, JSON.stringify(testLog, null, 2));

// Write daily summary
const dailyLogFile = path.join(logsDir, `daily-${new Date().toISOString().split('T')[0]}.log`);
const summaryEntry = {
  timestamp: testLog.timestamp,
  language: 'en',
  totalErrors: 3,
  missingKeys: 3,
  fallbackKeys: 0,
  errorKeys: 0,
  page: '/test',
  url: 'http://localhost:3000/test',
  userAgent: 'Test Script'
};
fs.appendFileSync(dailyLogFile, JSON.stringify(summaryEntry) + '\n');

// Create master summary
const masterSummaryFile = path.join(logsDir, 'master-error-summary.json');
const masterSummary = {
  lastUpdated: new Date().toISOString(),
  totalErrorsLogged: 3,
  errorsByLanguage: { en: 3 },
  errorsByPage: { '/test': 1, '/dashboard': 1, '/navbar': 1 },
  errorsBySeverity: {
    missing: 3,
    fallback: 0,
    error: 0
  },
  recentErrors: [{
    timestamp: testLog.timestamp,
    language: 'en',
    totalErrors: 3,
    page: '/test',
    errors: testLog.errors.slice(0, 2)
  }]
};
fs.writeFileSync(masterSummaryFile, JSON.stringify(masterSummary, null, 2));

console.log('✅ Test translation error logs created successfully!');
console.log(`📁 Log directory: ${logsDir}`);
console.log(`📄 Individual log: ${logFileName}`);
console.log(`📊 Daily summary: daily-${new Date().toISOString().split('T')[0]}.log`);
console.log(`📈 Master summary: master-error-summary.json`);

// List all files in the logs directory
console.log('\n📋 Files in logs directory:');
const files = fs.readdirSync(logsDir);
files.forEach(file => {
  const filePath = path.join(logsDir, file);
  const stats = fs.statSync(filePath);
  console.log(`  - ${file} (${stats.size} bytes)`);
});