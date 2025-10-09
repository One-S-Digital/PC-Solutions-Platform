#!/usr/bin/env node

/**
 * Fix the Final 51 Missing Keys
 * Handles namespace prefixes and dynamic key patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANS_DIR = path.join(__dirname, '..', 'packages', 'translations', 'locales', 'en');

function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const common = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'common.json'), 'utf8'));
const auth = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'auth.json'), 'utf8'));
const dashboard = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'dashboard.json'), 'utf8'));

console.log('🔧 Fixing Final 51 Missing Keys\n');

// 1. Status-related dynamic keys (add common statuses)
const statuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'active', 'inactive', 'paid', 'shipped'];
statuses.forEach(status => {
  setNested(common, `orderStatus.${status}`, status.charAt(0).toUpperCase() + status.slice(1));
  setNested(common, `serviceStatus.${status}`, status.charAt(0).toUpperCase() + status.slice(1));
});
console.log('✅ Added orderStatus and serviceStatus for common statuses');

// 2. User roles (all variants)
if (!common.userRoles) common.userRoles = {};
const roles = {
  "parent": "Parent",
  "educator": "Educator", 
  "foundation": "Foundation",
  "admin": "Administrator",
  "productSupplier": "Product Supplier",
  "serviceProvider": "Service Provider",
  "Product Supplier": "Product Supplier",
  "Service Provider": "Service Provider",
  "PARENT": "Parent",
  "EDUCATOR": "Educator",
  "FOUNDATION": "Foundation"
};
Object.assign(common.userRoles, roles);
console.log('✅ Added all userRole variants');

// 3. Vendor client reasons
common.vendorClientReasons = {
  "inactive": "Inactive",
  "testing": "Testing",
  "trial": "Trial",
  "demo": "Demo"
};
console.log('✅ Added vendorClientReasons');

// 4. Stock status
if (!common.stockStatus) common.stockStatus = {};
Object.assign(common.stockStatus, {
  "instock": "In Stock",
  "outofstock": "Out of Stock",
  "lowstock": "Low Stock",
  "discontinued": "Discontinued",
  "inStock": "In Stock",
  "outOfStock": "Out of Stock",
  "lowStock": "Low Stock"
});
console.log('✅ Added stockStatus variants');

// 5. Dashboard time ago
setNested(dashboard, 'dashboardPage.timeAgo.minutes', '{{count}} minutes ago');
setNested(dashboard, 'dashboardPage.timeAgo.hours', '{{count}} hours ago');
setNested(dashboard, 'dashboardPage.timeAgo.days', '{{count}} days ago');
console.log('✅ Added dashboardPage.timeAgo');

// 6. Dashboard detail page status
setNested(dashboard, 'dashboardDetailPage.newOrders.status.paid', 'Paid');
setNested(dashboard, 'dashboardDetailPage.newOrders.status.pending', 'Pending');
console.log('✅ Added dashboardDetailPage.newOrders.status');

// 7. Content upload specific keys
setNested(common, 'contentUploadModal.criticalityOptions.normal', 'Normal');
setNested(common, 'contentUploadModal.fileUpload.hrPolicyAllowedTypes', 'PDF, DOC, DOCX');
console.log('✅ Added contentUploadModal specific keys');

// 8. Content types
common.contentType = {
  "course": "Course",
  "video": "Video",
  "pdf": "PDF",
  "link": "External Link",
  "policy": "Policy"
};
console.log('✅ Added contentType');

// 9. E-learning types
common.eLearningTypes = {
  "course": "Course",
  "video": "Video",
  "pdf": "PDF Document",
  "link": "External Link"
};
console.log('✅ Added eLearningTypes');

// 10. Policy status options
common.policyStatusOptions = {
  "active": "Active",
  "archived": "Archived",
  "draft": "Draft"
};
console.log('✅ Added policyStatusOptions');

// 11. Users page status
setNested(dashboard, 'usersPage.status.active', 'Active');
setNested(dashboard, 'usersPage.status.inactive', 'Inactive');
setNested(dashboard, 'usersPage.status.pending', 'Pending');
setNested(dashboard, 'usersPage.status.suspended', 'Suspended');
console.log('✅ Added usersPage.status');

// 12. Admin monitoring page
setNested(dashboard, 'adminSystemMonitoringPage.overallStatus.operational', 'Operational');
setNested(dashboard, 'adminSystemMonitoringPage.overallStatus.degraded', 'Degraded');
setNested(dashboard, 'adminSystemMonitoringPage.overallStatus.down', 'Down');
setNested(dashboard, 'adminSystemMonitoringPage.databasePerformance.healthy', 'Healthy');
setNested(dashboard, 'adminSystemMonitoringPage.databasePerformance.degraded', 'Degraded');
setNested(dashboard, 'adminSystemMonitoringPage.eventTypes.info', 'Information');
setNested(dashboard, 'adminSystemMonitoringPage.eventTypes.warning', 'Warning');
setNested(dashboard, 'adminSystemMonitoringPage.eventTypes.error', 'Error');
console.log('✅ Added adminSystemMonitoringPage dynamic keys');

// Save files
fs.writeFileSync(path.join(TRANS_DIR, 'common.json'), JSON.stringify(common, null, 2) + '\n');
fs.writeFileSync(path.join(TRANS_DIR, 'auth.json'), JSON.stringify(auth, null, 2) + '\n');
fs.writeFileSync(path.join(TRANS_DIR, 'dashboard.json'), JSON.stringify(dashboard, null, 2) + '\n');

console.log('\n✅ All final keys added to English!');
console.log('💾 Files saved\n');
