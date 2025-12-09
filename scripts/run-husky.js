#!/usr/bin/env node

const { spawnSync } = require('child_process');

if (process.env.HUSKY === '0' || process.env.HUSKY_SKIP_INSTALL === '1') {
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
  huskyBin = require.resolve('husky/lib/bin');
} catch (error) {
  console.log('Husky not found in node_modules, bootstrapping with npx...');
  const status = run('npx', ['--yes', 'husky@9.1.7', 'install']);
  process.exit(status);
}

const status = run('node', [huskyBin, 'install']);
process.exit(status);
