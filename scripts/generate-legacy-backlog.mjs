#!/usr/bin/env node

/**
 * Generate Legacy Backlog Markdown
 * 
 * Reads scripts/i18n-hardcoded-report.json and generates
 * docs/i18n-legacy-backlog.md for visibility and tracking.
 * 
 * This is a tracking document only - no enforcement.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_PATH = path.join(__dirname, 'i18n-hardcoded-report.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'i18n-legacy-backlog.md');

function getArea(filePath) {
  if (filePath.startsWith('frontend/')) return 'frontend';
  if (filePath.startsWith('admin/')) return 'admin';
  if (filePath.startsWith('packages/ui/')) return 'ui';
  if (filePath.startsWith('packages/translations/')) return 'translations';
  return 'other';
}

function generateMarkdown(report) {
  const { legacyHigh, legacyMedium, totals, timestamp } = report;
  
  const allLegacy = [...legacyHigh, ...legacyMedium];
  
  if (allLegacy.length === 0) {
    return `# i18n Legacy Backlog

> **Last Updated:** ${new Date(timestamp).toLocaleString()}

## ✅ No Legacy Issues

All hardcoded strings have been translated!

---
*This document is auto-generated from \`scripts/i18n-hardcoded-report.json\`*
`;
  }
  
  // Group by area
  const byArea = {
    frontend: [],
    admin: [],
    ui: [],
    translations: [],
    other: []
  };
  
  allLegacy.forEach(issue => {
    const area = getArea(issue.file);
    byArea[area].push(issue);
  });
  
  // Group by file within each area
  const byFile = {};
  allLegacy.forEach(issue => {
    const area = getArea(issue.file);
    const key = `${area}:${issue.file}`;
    if (!byFile[key]) {
      byFile[key] = { area, file: issue.file, issues: [] };
    }
    byFile[key].issues.push(issue);
  });
  
  // Sort files by issue count (most issues first)
  const fileEntries = Object.values(byFile).sort((a, b) => {
    const aHigh = a.issues.filter(i => i.confidence === 'high').length;
    const bHigh = b.issues.filter(i => i.confidence === 'high').length;
    if (aHigh !== bHigh) return bHigh - aHigh;
    return b.issues.length - a.issues.length;
  });
  
  let markdown = `# i18n Legacy Backlog

> **Last Updated:** ${new Date(timestamp).toLocaleString()}
> 
> **Purpose:** Tracking document only - these issues do NOT block commits or releases.
> Fix them incrementally when working in affected files.

## Summary

- **Total Legacy Issues:** ${allLegacy.length}
- **High Confidence:** ${totals.legacyHigh}
- **Medium Confidence:** ${totals.legacyMedium}

### By Area

| Area | High | Medium | Total |
|------|------|--------|-------|
| Frontend | ${byArea.frontend.filter(i => i.confidence === 'high').length} | ${byArea.frontend.filter(i => i.confidence === 'medium').length} | ${byArea.frontend.length} |
| Admin | ${byArea.admin.filter(i => i.confidence === 'high').length} | ${byArea.admin.filter(i => i.confidence === 'medium').length} | ${byArea.admin.length} |
| UI Package | ${byArea.ui.filter(i => i.confidence === 'high').length} | ${byArea.ui.filter(i => i.confidence === 'medium').length} | ${byArea.ui.length} |
| Translations | ${byArea.translations.filter(i => i.confidence === 'high').length} | ${byArea.translations.filter(i => i.confidence === 'medium').length} | ${byArea.translations.length} |
| Other | ${byArea.other.filter(i => i.confidence === 'high').length} | ${byArea.other.filter(i => i.confidence === 'medium').length} | ${byArea.other.length} |

---

## Issues by File

`;

  // Group by area for organization
  const areas = ['frontend', 'admin', 'ui', 'translations', 'other'];
  
  for (const area of areas) {
    const areaFiles = fileEntries.filter(e => e.area === area);
    if (areaFiles.length === 0) continue;
    
    markdown += `### ${area.charAt(0).toUpperCase() + area.slice(1)}\n\n`;
    
    for (const fileEntry of areaFiles) {
      const { file, issues } = fileEntry;
      const highIssues = issues.filter(i => i.confidence === 'high');
      const mediumIssues = issues.filter(i => i.confidence === 'medium');
      
      markdown += `#### \`${file}\`\n\n`;
      markdown += `**Total:** ${issues.length} (${highIssues.length} high, ${mediumIssues.length} medium)\n\n`;
      
      if (highIssues.length > 0) {
        markdown += `**High Confidence:**\n\n`;
        highIssues.forEach(issue => {
          markdown += `- Line ${issue.line}: \`"${issue.text}"\`\n`;
        });
        markdown += '\n';
      }
      
      if (mediumIssues.length > 0) {
        markdown += `**Medium Confidence:**\n\n`;
        mediumIssues.slice(0, 10).forEach(issue => {
          markdown += `- Line ${issue.line}: \`"${issue.text}"\`\n`;
        });
        if (mediumIssues.length > 10) {
          markdown += `- ... and ${mediumIssues.length - 10} more\n`;
        }
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    }
  }
  
  markdown += `\n---\n\n*This document is auto-generated from \`scripts/i18n-hardcoded-report.json\`*\n`;
  markdown += `*Run \`node scripts/generate-legacy-backlog.mjs\` to regenerate*\n`;
  
  return markdown;
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`❌ Report file not found: ${REPORT_PATH}`);
    console.error('   Run scripts/find-hardcoded-strings.mjs first to generate the report.');
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const markdown = generateMarkdown(report);
  
  // Ensure docs directory exists
  const docsDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');
  console.log(`✅ Legacy backlog generated: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log(`   Total legacy issues: ${report.totals.legacyHigh + report.totals.legacyMedium}`);
}

main();

