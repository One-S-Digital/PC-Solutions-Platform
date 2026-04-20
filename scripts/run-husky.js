#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const gitDirectory = path.join(repoRoot, '.git');

if (
  process.env.HUSKY === '0' ||
  process.env.HUSKY_SKIP_INSTALL === '1' ||
  process.env.CI === 'true' ||
  process.env.RENDER === 'true'
) {
  process.exit(0);
}

if (!fs.existsSync(gitDirectory)) {
  console.log('Husky install skipped: .git directory not found (likely production build artifact).');
  process.exit(0);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repoRoot });
  if (result.error) {
    console.warn(`Failed to run ${command}:`, result.error.message);
  }
  return result.status ?? 0;
}

let huskyBin;
try {
  huskyBin = require.resolve('husky/bin.js', { paths: [repoRoot] });
} catch (error) {
  console.error('Husky not found. Please ensure dependencies are installed (e.g., run pnpm install).');
  process.exit(0);
}

const status = run('node', [huskyBin, 'install']);

if (status !== 0) {
  console.warn('Husky install exited with a non-zero status. Continuing without git hooks.');
  process.exit(0);
}

console.log('Husky git hooks installed successfully.');
process.exit(0);
