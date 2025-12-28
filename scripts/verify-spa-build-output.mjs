import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const appDir = process.argv[2] || 'frontend';
const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, appDir, 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  fail(`Missing build output: ${indexPath}. Did the ${appDir} build run?`);
}

const html = fs.readFileSync(indexPath, 'utf8');

// If we ever ship source entrypoints, the server will return HTML for them (SPA fallback),
// and browsers will throw "Failed to load module script ... MIME type text/html".
const hasTsModuleRefs = /\b(?:src|href)=["']\/[^"']+\.(?:ts|tsx)\b/i.test(html);
if (hasTsModuleRefs) {
  fail(
    `${appDir}/dist/index.html references .ts/.tsx assets. This indicates the source index.html was shipped instead of a Vite-built output.`,
  );
}

// Vite production output should reference hashed assets under /assets/
const hasAssetsJs = /\/assets\/[^"']+\.(?:mjs|js)\b/i.test(html);
if (!hasAssetsJs) {
  fail(`${appDir}/dist/index.html does not reference /assets/*.js. Build output looks wrong.`);
}

console.log(`✅ ${appDir} build output looks OK (${indexPath})`);

