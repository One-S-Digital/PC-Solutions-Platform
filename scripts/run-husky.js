#!/usr/bin/env node

const { spawnSync } = require('child_process');

if (process.env.HUSKY === '0' || process.env.HUSKY_SKIP_INSTALL === '1' || process.env.CI === 'true') {
  console.log('Husky install disabled by environment.');
  process.exit(0);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.warn(`Failed to run ${command}:`, result.error.message);
  }
  return result.status ?? 0;
}

let huskyBin;
try {
  huskyBin = require.resolve('husky/bin.js');
} catch (error) {
  console.error('Husky not found. Please ensure dependencies are installed (e.g., run pnpm install).');
  process.exit(1);
}

const status = run('node', [huskyBin, 'install']);
process.exit(status);
