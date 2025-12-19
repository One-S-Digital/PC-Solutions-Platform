#!/usr/bin/env node

/**
 * Minimal prebuild guard that ensures `pnpm-lock.yaml` stays in sync with
 * root-level dependencies. Render now runs this script before attempting a
 * frozen install so we can fail fast with an actionable message instead of
 * letting the install blow up mid-build.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const lockfilePath = path.join(repoRoot, 'pnpm-lock.yaml');

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Required file missing: ${filePath}`);
    process.exit(1);
  }
}

assertFileExists(packageJsonPath);
assertFileExists(lockfilePath);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');

function extractRootImporterBlock(content) {
  const lines = content.split(/\r?\n/);
  let capturing = false;
  const block = [];

  for (const line of lines) {
    if (!capturing) {
      if (line.startsWith('  .:')) {
        capturing = true;
      }
      continue;
    }

    if (line.startsWith('  ') && !line.startsWith('    ') && line.trim().length) {
      break;
    }

    block.push(line);
  }

  if (!capturing || block.length === 0) {
    console.error('Unable to locate root workspace importers inside pnpm-lock.yaml.');
    process.exit(1);
  }

  return block.join('\n');
}

function stripQuotes(value) {
  if (!value) return value;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function collectSections(blockContent) {
  const sections = {};
  const lines = blockContent.split(/\r?\n/);
  let currentSection = null;
  let currentName = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      continue;
    }

    const indent = rawLine.match(/^(\s*)/)?.[1].length ?? 0;
    const line = rawLine.trim();

    if (indent === 4 && line.endsWith(':')) {
      currentSection = line.slice(0, -1);
      if (!sections[currentSection]) {
        sections[currentSection] = {};
      }
      currentName = null;
      continue;
    }

    if (indent === 6 && line.endsWith(':')) {
      currentName = stripQuotes(line.slice(0, -1));
      continue;
    }

    if (indent === 8 && line.startsWith('specifier:')) {
      if (currentSection && currentName) {
        const specifierValue = line.replace('specifier:', '').trim();
        sections[currentSection][currentName] = specifierValue;
      }
      continue;
    }

    if (indent <= 4) {
      currentName = null;
    }
  }

  return sections;
}

const rootImporterBlock = extractRootImporterBlock(lockfileContent);
const sections = collectSections(rootImporterBlock);

function compareDeps(pkgDeps, sectionName) {
  const lockSection = sections[sectionName] ?? {};
  const mismatches = [];

  if (!pkgDeps) {
    return mismatches;
  }

  for (const [name, specifier] of Object.entries(pkgDeps)) {
    const lockSpecifier = lockSection[name];
    if (!lockSpecifier) {
      mismatches.push(`[${sectionName}] Missing "${name}" in pnpm-lock.yaml (expected ${specifier}).`);
      continue;
    }
    if (lockSpecifier !== specifier) {
      mismatches.push(
        `[${sectionName}] "${name}" specifier mismatch. pnpm-lock.yaml has "${lockSpecifier}" but package.json requires "${specifier}".`,
      );
    }
  }

  return mismatches;
}

const mismatches = [
  ...compareDeps(packageJson.dependencies, 'dependencies'),
  ...compareDeps(packageJson.devDependencies, 'devDependencies'),
];

if (mismatches.length > 0) {
  console.error('❌ pnpm-lock.yaml is out of sync with package.json:');
  for (const mismatch of mismatches) {
    console.error(`  - ${mismatch}`);
  }
  console.error('\nFix it by running "pnpm install" at the repo root and committing the updated pnpm-lock.yaml.');
  process.exit(1);
}

console.log('✅ pnpm-lock.yaml matches package.json. Safe to proceed with frozen installs.');
