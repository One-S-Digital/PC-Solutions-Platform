#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Get all files that import useTranslation from react-i18next
const files = execSync('grep -r "useTranslation.*from.*react-i18next" frontend --include="*.tsx" --include="*.ts" -l', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(file => file.length > 0);

console.log(`Found ${files.length} files to update:`);
files.forEach(file => console.log(`  - ${file}`));

// Update each file
files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the import statement
    const updatedContent = content.replace(
      /import\s*{\s*useTranslation\s*}\s*from\s*['"]react-i18next['"];?/g,
      "import { useTranslation } from '@workspace/translations';"
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Translation import updates completed!');
