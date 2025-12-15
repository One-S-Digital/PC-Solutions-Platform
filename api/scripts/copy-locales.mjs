#!/usr/bin/env node

/**
 * Cross-platform script to copy translation locale files
 * from packages/translations/locales to api/dist/locales
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths relative to api/scripts directory
const apiRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(apiRoot, '..', 'packages', 'translations', 'locales');
const destPath = path.resolve(apiRoot, 'dist', 'locales');

console.log(`📦 Copying locales from ${sourcePath} to ${destPath}`);

// Remove destination if it exists
if (fs.existsSync(destPath)) {
  fs.rmSync(destPath, { recursive: true, force: true });
  console.log(`   Removed existing ${destPath}`);
}

// Ensure dist directory exists
const distDir = path.resolve(apiRoot, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy recursively
fs.cpSync(sourcePath, destPath, { recursive: true });
console.log(`✅ Successfully copied locales to ${destPath}`);

