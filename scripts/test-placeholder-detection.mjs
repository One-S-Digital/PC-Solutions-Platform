#!/usr/bin/env node

/**
 * Test placeholder detection logic
 */

const prefixPattern = /^\[(FR|DE|EN)\]\s*/i;

function isPlaceholder(value, sourceValue) {
  if (!value) return true;
  
  // Check if it matches source exactly (case-insensitive)
  if (value.trim().toLowerCase() === sourceValue.trim().toLowerCase()) return true;
  
  // Check if it has a prefix like [FR], [DE], [EN] - ANY value with these prefixes is a placeholder
  if (prefixPattern.test(value)) {
    return true; // Any value with [FR], [DE], or [EN] prefix is considered a placeholder
  }
  
  return false;
}

// Test cases
const testCases = [
  { value: '[FR] Secondary (Disabled)', source: 'Secondary (Disabled)', expected: true },
  { value: '[DE] Secondary (Disabled)', source: 'Secondary (Disabled)', expected: true },
  { value: '[fr] Secondary (Disabled)', source: 'Secondary (Disabled)', expected: true },
  { value: '[de] Secondary (Disabled)', source: 'Secondary (Disabled)', expected: true },
  { value: 'Secondary (Disabled)', source: 'Secondary (Disabled)', expected: true }, // exact match
  { value: 'Secondaire (Désactivé)', source: 'Secondary (Disabled)', expected: false },
  { value: '', source: 'Secondary (Disabled)', expected: true },
];

console.log('Testing placeholder detection:\n');

testCases.forEach((test, i) => {
  const result = isPlaceholder(test.value, test.source);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} Test ${i + 1}: "${test.value}" -> ${result} (expected ${test.expected})`);
  if (result !== test.expected) {
    console.log(`   Source: "${test.source}"`);
    console.log(`   Prefix pattern test: ${prefixPattern.test(test.value)}`);
  }
});

