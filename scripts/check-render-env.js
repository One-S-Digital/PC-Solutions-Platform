#!/usr/bin/env node

/**
 * Check Sentry environment variables in Render services
 * 
 * Usage:
 *   RENDER_API_KEY=your-key node scripts/check-render-env.js
 * 
 * Or save your API key:
 *   node scripts/check-render-env.js --save-key your-render-api-key
 *   node scripts/check-render-env.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Config file location
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.render-api-key');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Service configurations
const SERVICES = [
  {
    name: 'pc-solutions-frontend',
    displayName: 'Frontend',
    requiredVars: ['VITE_SENTRY_DSN'],
    optionalVars: ['VITE_SENTRY_RELEASE', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'],
  },
  {
    name: 'pc-solutions-admin',
    displayName: 'Admin',
    requiredVars: ['VITE_SENTRY_DSN'],
    optionalVars: ['VITE_SENTRY_RELEASE', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'],
  },
  {
    name: 'pc-solutions-v2',
    displayName: 'API',
    requiredVars: ['SENTRY_DSN'],
    optionalVars: ['SENTRY_RELEASE', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'],
  },
];

// Parse command line arguments
const args = process.argv.slice(2);
if (args[0] === '--save-key' && args[1]) {
  fs.writeFileSync(CONFIG_FILE, args[1], 'utf8');
  fs.chmodSync(CONFIG_FILE, 0o600); // Make it readable only by owner
  console.log(c('green', '✓ API key saved successfully'));
  console.log(`Run ${c('cyan', 'node scripts/check-render-env.js')} to check environment variables\n`);
  process.exit(0);
}

// Get API key
let RENDER_API_KEY = process.env.RENDER_API_KEY;
if (!RENDER_API_KEY && fs.existsSync(CONFIG_FILE)) {
  RENDER_API_KEY = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
}

if (!RENDER_API_KEY) {
  console.error(c('red', 'ERROR: RENDER_API_KEY not found\n'));
  console.log('To use this script, you need a Render API key.\n');
  console.log('Option 1: Set environment variable');
  console.log(c('cyan', '  export RENDER_API_KEY="your-api-key"'));
  console.log(c('cyan', '  node scripts/check-render-env.js\n'));
  console.log('Option 2: Save the key (recommended)');
  console.log(c('cyan', '  node scripts/check-render-env.js --save-key your-api-key'));
  console.log(c('cyan', '  node scripts/check-render-env.js\n'));
  console.log('To get your API key:');
  console.log('1. Go to https://dashboard.render.com/');
  console.log('2. Click your profile → Account Settings');
  console.log('3. Navigate to API Keys');
  console.log('4. Create a new API key\n');
  process.exit(1);
}

// Make HTTPS request
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Check a service's environment variables
async function checkService(service) {
  console.log(c('blue', `\n=== ${service.displayName} (${service.name}) ===`));

  try {
    // Get service by name
    const servicesRes = await httpsRequest({
      hostname: 'api.render.com',
      path: `/v1/services?name=${encodeURIComponent(service.name)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (servicesRes.status !== 200) {
      console.error(c('red', `Error: ${servicesRes.status}`));
      console.error(servicesRes.data.message || servicesRes.data);
      return { service: service.name, error: true };
    }

    const services = servicesRes.data;
    if (!services || services.length === 0) {
      console.error(c('red', `✗ Service not found: ${service.name}`));
      console.log(c('yellow', 'Tip: Check if the service name in render.yaml matches the actual service name in Render Dashboard'));
      return { service: service.name, notFound: true };
    }

    const serviceId = services[0].service.id;
    console.log(c('cyan', `Service ID: ${serviceId}`));

    // Get environment variables
    const envRes = await httpsRequest({
      hostname: 'api.render.com',
      path: `/v1/services/${serviceId}/env-vars`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (envRes.status !== 200) {
      console.error(c('red', `Error fetching env vars: ${envRes.status}`));
      return { service: service.name, error: true };
    }

    const envVars = envRes.data;
    const envVarMap = {};
    envVars.forEach(v => {
      envVarMap[v.key] = v.value;
    });

    // Check required variables
    const results = {
      service: service.name,
      displayName: service.displayName,
      required: {},
      optional: {},
    };

    console.log(c('cyan', '\nRequired Variables:'));
    for (const varName of service.requiredVars) {
      const value = envVarMap[varName];
      if (value && value !== 'null' && value.length > 0) {
        const masked = value.substring(0, 20) + '...';
        console.log(c('green', `  ✓ ${varName}: SET`) + c('yellow', ` (${masked})`));
        results.required[varName] = true;
      } else {
        console.log(c('red', `  ✗ ${varName}: NOT SET OR MISSING`));
        results.required[varName] = false;
      }
    }

    console.log(c('cyan', '\nOptional Variables:'));
    for (const varName of service.optionalVars) {
      const value = envVarMap[varName];
      if (value && value !== 'null' && value.length > 0) {
        const masked = varName.includes('TOKEN') ? '[REDACTED]' : value.substring(0, 15) + '...';
        console.log(c('green', `  ✓ ${varName}: SET`) + c('yellow', ` (${masked})`));
        results.optional[varName] = true;
      } else {
        console.log(c('yellow', `  - ${varName}: not set`));
        results.optional[varName] = false;
      }
    }

    return results;

  } catch (error) {
    console.error(c('red', `Error: ${error.message}`));
    return { service: service.name, error: true };
  }
}

// Main function
async function main() {
  console.log(c('blue', '\n╔═══════════════════════════════════════════════════════╗'));
  console.log(c('blue', '║     Render Sentry Environment Variables Checker      ║'));
  console.log(c('blue', '╚═══════════════════════════════════════════════════════╝\n'));

  const allResults = [];

  for (const service of SERVICES) {
    const result = await checkService(service);
    allResults.push(result);
  }

  // Summary
  console.log(c('blue', '\n╔═══════════════════════════════════════════════════════╗'));
  console.log(c('blue', '║                       SUMMARY                         ║'));
  console.log(c('blue', '╚═══════════════════════════════════════════════════════╝\n'));

  let hasErrors = false;
  let missingRequired = [];

  for (const result of allResults) {
    if (result.error || result.notFound) {
      hasErrors = true;
      continue;
    }

    for (const [varName, isSet] of Object.entries(result.required)) {
      if (!isSet) {
        missingRequired.push({ service: result.displayName, var: varName });
      }
    }
  }

  if (hasErrors) {
    console.log(c('red', '⚠ Some services could not be checked (see errors above)\n'));
  }

  if (missingRequired.length > 0) {
    console.log(c('red', '✗ Missing Required Sentry Variables:\n'));
    for (const missing of missingRequired) {
      console.log(c('red', `  • ${missing.service}: ${missing.var}`));
    }
    console.log();
    console.log(c('yellow', '📋 To fix this:'));
    console.log('1. Go to https://dashboard.render.com/');
    console.log('2. Select the service');
    console.log('3. Go to Environment tab');
    console.log('4. Add the missing variable(s)');
    console.log('5. Save and redeploy\n');
    console.log(c('cyan', '💡 To get Sentry DSN values:'));
    console.log('1. Go to https://sentry.io/');
    console.log('2. Create projects for frontend, admin, and api');
    console.log('3. Copy the DSN from Settings → Client Keys (DSN)');
    console.log('4. Add to Render environment variables\n');
  } else {
    console.log(c('green', '✓ All required Sentry variables are configured!\n'));
    console.log('Your Sentry integration should be working correctly.');
    console.log('Check your Sentry dashboard at https://sentry.io/ for events.\n');
  }

  process.exit(missingRequired.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(c('red', '\nFatal error:'), error);
  process.exit(1);
});
