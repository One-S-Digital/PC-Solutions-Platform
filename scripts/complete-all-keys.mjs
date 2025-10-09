#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANS_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales', 'en');

const common = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'common.json'), 'utf8'));
const auth = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'auth.json'), 'utf8'));
const dashboard = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'dashboard.json'), 'utf8'));
const pricing = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'pricing.json'), 'utf8'));

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

console.log('🔧 Completing ALL Final Missing Keys\n');

// Complete all status and role values
let addedCount = 0;

// Order statuses
const orderStatuses = ['pending', 'approved', 'confirmed', 'processing', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
if (!common.orderStatus) common.orderStatus = {};
orderStatuses.forEach(s => {
  if (!common.orderStatus[s]) {
    common.orderStatus[s] = s.charAt(0).toUpperCase() + s.slice(1);
    addedCount++;
  }
});

// Service statuses
const serviceStatuses = ['pending', 'confirmed', 'inprogress', 'completed', 'cancelled', 'scheduled'];
if (!common.serviceStatus) common.serviceStatus = {};
serviceStatuses.forEach(s => {
  if (!common.serviceStatus[s]) {
    common.serviceStatus[s] = s === 'inprogress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
    addedCount++;
  }
});

// Content types
const contentTypes = ['course', 'video', 'pdf', 'link', 'policy'];
if (!common.contentUploadModal) common.contentUploadModal = {};
if (!common.contentUploadModal.contentType) common.contentUploadModal.contentType = {};
contentTypes.forEach(t => {
  if (!common.contentUploadModal.contentType[t]) {
    common.contentUploadModal.contentType[t] = t.charAt(0).toUpperCase() + t.slice(1);
    addedCount++;
  }
});

// Dashboard detail types
const detailTypes = ['activeUsers', 'newOrders', 'openJobs', 'pageViews'];
detailTypes.forEach(t => {
  setNested(dashboard, `dashboardPage.${t}`, t.replace(/([A-Z])/g, ' $1').trim());
  addedCount++;
});

console.log(`✅ Added ${addedCount} dynamic key values\n`);

// Save files
fs.writeFileSync(path.join(TRANS_DIR, 'common.json'), JSON.stringify(common, null, 2) + '\n');
fs.writeFileSync(path.join(TRANS_DIR, 'auth.json'), JSON.stringify(auth, null, 2) + '\n');
fs.writeFileSync(path.join(TRANS_DIR, 'dashboard.json'), JSON.stringify(dashboard, null, 2) + '\n');
fs.writeFileSync(path.join(TRANS_DIR, 'pricing.json'), JSON.stringify(pricing, null, 2) + '\n');

console.log('💾 Files saved');
console.log('✅ All possible static values added!');
