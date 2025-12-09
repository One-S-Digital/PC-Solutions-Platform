#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase());
const falsy = (value) => ['0', 'false', 'no', 'off'].includes((value ?? '').toLowerCase());

const env = (process.env.NODE_ENV ?? '').toLowerCase();
const forceInstall = truthy(process.env.FORCE_HUSKY);

const skipReasons = [];

if (truthy(process.env.CI)) skipReasons.push('CI');
if (env === 'production') skipReasons.push('NODE_ENV=production');
if (truthy(process.env.SKIP_HUSKY)) skipReasons.push('SKIP_HUSKY');
if (truthy(process.env.HUSKY_SKIP_INSTALL)) skipReasons.push('HUSKY_SKIP_INSTALL');
if (falsy(process.env.HUSKY)) skipReasons.push('HUSKY=0');

if (!forceInstall && skipReasons.length) {
  console.log(`[prepare-husky] Skipping husky install (${skipReasons.join(', ')}).`);
  process.exit(0);
}

const result = spawnSync('pnpm', ['exec', 'husky', 'install'], { stdio: 'inherit' });

if (result.error) {
  if (result.error.code === 'ENOENT' && !forceInstall) {
    console.warn('[prepare-husky] pnpm or husky not found; skipping.');
    process.exit(0);
  }

  throw result.error;
}

if (result.status !== 0) {
  const message = `[prepare-husky] Husky install exited with code ${result.status}.`;

  if (forceInstall) {
    console.error(message);
    process.exit(result.status);
  }

  console.warn(`${message} Continuing without git hooks.`);
  process.exit(0);
}

console.log('[prepare-husky] Husky install complete.');
