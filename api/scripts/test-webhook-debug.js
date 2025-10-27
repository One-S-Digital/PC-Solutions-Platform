#!/usr/bin/env node

/**
 * Enhanced webhook debugging script
 * This script helps test and debug the webhook endpoint
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-api-service.onrender.com/api/webhooks/clerk';
const HEALTH_URL = WEBHOOK_URL.replace('/webhooks/clerk', '/webhooks/clerk/health');

console.log('🧪 Webhook Debugging Tool');
console.log('========================');
console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
console.log(`🏥 Health URL: ${HEALTH_URL}`);
console.log('');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('🏥 Testing health check endpoint...');
  
  return new Promise((resolve) => {
    const isHttps = HEALTH_URL.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(HEALTH_URL, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log('   Response:', JSON.stringify(response, null, 2));
          resolve(res.statusCode === 200);
        } catch (e) {
          console.log('   Raw response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Test 2: Webhook Endpoint (should return 400 for missing headers)
async function testWebhookEndpoint() {
  console.log('🔗 Testing webhook endpoint (expecting 400 for missing headers)...');
  
  return new Promise((resolve) => {
    const isHttps = WEBHOOK_URL.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(WEBHOOK_URL, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
        
        // 400 is expected for missing headers
        if (res.statusCode === 400 && data.includes('Missing Svix headers')) {
          console.log('   ✅ Webhook endpoint is accessible and properly configured');
          resolve(true);
        } else if (res.statusCode === 500 && data.includes('Webhook secret not configured')) {
          console.log('   ❌ Webhook secret is not configured');
          resolve(false);
        } else {
          console.log('   ⚠️ Unexpected response');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });
    
    req.write('{}');
    req.end();
  });
}

// Test 3: Check if service is running
async function testServiceRunning() {
  console.log('🌐 Testing if service is running...');
  
  const baseUrl = WEBHOOK_URL.replace('/api/webhooks/clerk', '');
  
  return new Promise((resolve) => {
    const isHttps = baseUrl.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(baseUrl, { method: 'GET' }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      if (res.statusCode === 204 || res.statusCode === 200) {
        console.log('   ✅ Service is running');
        resolve(true);
      } else {
        console.log('   ⚠️ Service responded but with unexpected status');
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('Starting webhook debugging tests...\n');
  
  const tests = [
    { name: 'Service Running', fn: testServiceRunning },
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Webhook Endpoint', fn: testWebhookEndpoint },
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('─'.repeat(50));
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed - check the logs above'}`);
  
  if (!allPassed) {
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check if CLERK_WEBHOOK_SECRET is set in Render environment variables');
    console.log('2. Verify your webhook URL in Clerk dashboard');
    console.log('3. Check Render logs for any startup errors');
    console.log('4. Ensure your service is deployed and running');
  }
}

// Run the tests
runTests().catch(console.error);