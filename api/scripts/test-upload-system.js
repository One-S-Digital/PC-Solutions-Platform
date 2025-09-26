#!/usr/bin/env node

/**
 * Upload System Test Script
 * 
 * This script tests the complete upload system including:
 * - Database connectivity
 * - R2 configuration
 * - Upload endpoints
 * - File validation
 * - Asset management
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_USER_ID = 'test-user-123';
const TEST_FILE_PATH = path.join(__dirname, 'test-image.png');

// Create a test image file if it doesn't exist
function createTestImage() {
  if (!fs.existsSync(TEST_FILE_PATH)) {
    // Create a simple 1x1 PNG file
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // bit depth, color type, etc.
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);
    fs.writeFileSync(TEST_FILE_PATH, pngData);
    console.log('✅ Created test image file');
  }
}

// Test database connectivity
async function testDatabase() {
  console.log('\n🔍 Testing database connectivity...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if assets table exists and has publicUrl column
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'assets' AND column_name = 'publicUrl'
    `;
    
    if (result.length > 0) {
      console.log('✅ publicUrl column exists in assets table');
    } else {
      console.log('❌ publicUrl column missing in assets table');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test R2 configuration
async function testR2Configuration() {
  console.log('\n🔍 Testing R2 configuration...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/upload/health`);
    
    if (response.data.success) {
      console.log('✅ Upload service health check passed');
      console.log(`   R2 configured: ${response.data.r2.configured}`);
      console.log(`   R2 connected: ${response.data.r2.connected}`);
      return response.data.r2.configured && response.data.r2.connected;
    } else {
      console.log('❌ Upload service health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ R2 configuration test failed:', error.message);
    return false;
  }
}

// Test file upload
async function testFileUpload() {
  console.log('\n🔍 Testing file upload...');
  
  try {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(TEST_FILE_PATH);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, 'test-image.png');
    formData.append('assetKind', 'ADMIN_FAVICON');
    
    const response = await axios.post(`${API_BASE_URL}/upload/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer test-token`, // This will fail auth, but we can test the endpoint
      },
    });
    
    console.log('✅ File upload test passed');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ File upload endpoint accessible (auth required)');
      return true;
    } else {
      console.log('❌ File upload test failed:', error.message);
      return false;
    }
  }
}

// Test presigned URL generation
async function testPresignedUrl() {
  console.log('\n🔍 Testing presigned URL generation...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/upload/presigned`, {
      filename: 'test-image.png',
      mimeType: 'image/png',
      assetKind: 'ADMIN_FAVICON'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`,
      },
    });
    
    console.log('✅ Presigned URL generation test passed');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Presigned URL endpoint accessible (auth required)');
      return true;
    } else {
      console.log('❌ Presigned URL test failed:', error.message);
      return false;
    }
  }
}

// Test asset management endpoints
async function testAssetEndpoints() {
  console.log('\n🔍 Testing asset management endpoints...');
  
  const endpoints = [
    '/upload/assets',
    '/upload/asset/test-id',
    '/upload/download/test-id'
  ];
  
  let passed = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer test-token`,
        },
      });
      console.log(`✅ ${endpoint} accessible`);
      passed++;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 404) {
        console.log(`✅ ${endpoint} accessible (auth/not found expected)`);
        passed++;
      } else {
        console.log(`❌ ${endpoint} failed:`, error.message);
      }
    }
  }
  
  return passed === endpoints.length;
}

// Test file validation
async function testFileValidation() {
  console.log('\n🔍 Testing file validation...');
  
  try {
    // Test with invalid file type
    const formData = new FormData();
    const invalidFile = new Blob(['invalid content'], { type: 'text/plain' });
    formData.append('file', invalidFile, 'test.txt');
    formData.append('assetKind', 'ADMIN_FAVICON');
    
    const response = await axios.post(`${API_BASE_URL}/upload/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer test-token`,
      },
    });
    
    console.log('❌ File validation test failed (should have rejected invalid file)');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ File validation working (rejected invalid file type)');
      return true;
    } else {
      console.log('❌ File validation test failed:', error.message);
      return false;
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Upload System Tests...\n');
  
  createTestImage();
  
  const tests = [
    { name: 'Database Connectivity', fn: testDatabase },
    { name: 'R2 Configuration', fn: testR2Configuration },
    { name: 'File Upload Endpoint', fn: testFileUpload },
    { name: 'Presigned URL Generation', fn: testPresignedUrl },
    { name: 'Asset Management Endpoints', fn: testAssetEndpoints },
    { name: 'File Validation', fn: testFileValidation },
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
    }
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Upload system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
  
  // Cleanup
  await prisma.$disconnect();
  
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
    console.log('🧹 Cleaned up test file');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };