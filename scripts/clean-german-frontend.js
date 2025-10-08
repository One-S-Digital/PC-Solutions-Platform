const fs = require('fs');

function isSelfReferential(key, value, prefix = '') {
  if (typeof value !== 'string') return false;
  const lowerValue = value.toLowerCase();
  const lowerKey = key.toLowerCase();
  const fullKey = prefix ? `${prefix}.${key}` : key;
  
  return lowerValue.includes(lowerKey) && 
         (lowerValue.includes('modal') || lowerValue.includes('page') || 
          lowerValue.includes('form') || lowerValue.includes('.') ||
          lowerValue.includes('toggle') || lowerValue.includes('settings'));
}

function cleanObject(obj, prefix = '') {
  const cleaned = {};
  let removedCount = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const result = cleanObject(value, prefix ? `${prefix}.${key}` : key);
      if (Object.keys(result.cleaned).length > 0) {
        cleaned[key] = result.cleaned;
      } else {
        removedCount++;
      }
      removedCount += result.removedCount;
    } else if (typeof value === 'string') {
      if (isSelfReferential(key, value, prefix)) {
        console.log(`  ❌ Removing: ${prefix}.${key}`);
        removedCount++;
      } else {
        cleaned[key] = value;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return { cleaned, removedCount };
}

const filePath = 'frontend/public/locales/de/common.json';
console.log(`🧹 Cleaning ${filePath}\n`);

const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const result = cleanObject(content);

fs.writeFileSync(filePath, JSON.stringify(result.cleaned, null, 2) + '\n');
console.log(`\n✅ Cleaned ${result.removedCount} self-referential values`);
