#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes((value ?? '').toLowerCase());
const falsy = (value) => ['0', 'false', 'no', 'off'].includes((value ?? '').toLowerCase());

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const requestedVersion = pkg.dependencies?.husky ?? pkg.devDependencies?.husky ?? '';
const normalizeVersion = (specifier) => specifier?.replace(/^[^\d]*/, '') ?? '';
const normalized = normalizeVersion(requestedVersion);
const huskySpecifier = normalized ? `husky@${normalized}` : 'husky';

const forceInstall = truthy(process.env.FORCE_HUSKY);
const skipReasons = [];

if (truthy(process.env.SKIP_HUSKY)) skipReasons.push('SKIP_HUSKY');
if (truthy(process.env.HUSKY_SKIP_INSTALL)) skipReasons.push('HUSKY_SKIP_INSTALL');
if (falsy(process.env.HUSKY)) skipReasons.push('HUSKY=0');

if (!forceInstall && skipReasons.length) {
  console.log(`[prepare-husky] Skipping husky install (${skipReasons.join(', ')}).`);
  process.exit(0);
}

const runCommand = (args) => {
  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    error: result.error,
  };
};

const steps = [
  { label: 'pnpm exec husky', args: ['exec', 'husky'] },
  { label: `pnpm dlx ${huskySpecifier}`, args: ['dlx', huskySpecifier] },
];

let lastFailure = null;

for (const step of steps) {
  const outcome = runCommand(step.args);

  if (!outcome.error && outcome.status === 0) {
    console.log(`[prepare-husky] Husky install complete via "${step.label}".`);
    process.exit(0);
  }

  lastFailure = outcome;
  console.warn(`[prepare-husky] "${step.label}" failed${forceInstall ? '' : ', attempting fallback'} (exit code ${outcome.status}).`);
}

const failureMessage = '[prepare-husky] Unable to install husky after all attempts.';

if (forceInstall) {
  console.error(`${failureMessage} Last exit code: ${lastFailure?.status ?? 'unknown'}.`);
  process.exit(lastFailure?.status ?? 1);
}

console.warn(`${failureMessage} Git hooks will be unavailable in this environment.`);
process.exit(0);
