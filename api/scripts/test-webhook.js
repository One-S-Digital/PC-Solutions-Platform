#!/usr/bin/env node

/**
 * Test script for Clerk webhook endpoint
 * This script helps verify that the webhook is working correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/clerk';
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || 'whsec_test_secret';

// Mock Clerk webhook payload for user.created event
const mockWebhookPayload = {
  type: 'user.created',
  data: {
    id: 'user_test123',
    email_addresses: [
      {
        email_address: 'test@example.com',
        id: 'idn_test123'
      }
    ],
    first_name: 'Test',
    last_name: 'User',
    created_at: Date.now(),
    updated_at: Date.now(),
    unsafe_metadata: {
      signupType: 'PARENT',
      pendingRole: 'PARENT'
    }
  }
};

// Simple HMAC-SHA256 implementation for testing
function createHmacSignature(payload, secret) {
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64');
  return `v1,${signature}`;
}

async function testWebhook() {
  console.log('🧪 Testing Clerk webhook endpoint...');
  console.log(`📍 URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
  
  const payload = JSON.stringify(mockWebhookPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmacSignature(mockWebhookPayload, WEBHOOK_SECRET);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'svix-id': 'msg_test123',
      'svix-timestamp': timestamp.toString(),
      'svix-signature': signature,
      'User-Agent': 'Svix-Webhooks/1.0'
    }
  };
  
  const isHttps = WEBHOOK_URL.startsWith('https://');
  const client = isHttps ? https : http;
  
  const req = client.request(WEBHOOK_URL, options, (res) => {
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 204) {
        console.log('✅ Webhook test PASSED - User should be created in database');
      } else {
        console.log('❌ Webhook test FAILED');
        console.log(`📄 Response: ${responseBody}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });
  
  req.write(payload);
  req.end();
}

// Run the test
testWebhook().catch(console.error);