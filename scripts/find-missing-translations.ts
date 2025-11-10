#!/usr/bin/env ts-node
/**
 * Scan frontend-facing projects for translation keys whose localized values
 * are missing from the shared translation resources.
 *
 * The script searches for string literals that look like i18next keys (optionally
 * with namespaces) and verifies that they exist in the English locale files
 * under packages/translations/locales/en.
 *
 * Usage:
 *   TS_NODE_COMPILER_OPTIONS='{"module":"esnext"}' pnpm ts-node scripts/find-missing-translations.ts
 * or
 *   TS_NODE_COMPILER_OPTIONS='{"module":"esnext"}' pnpm exec ts-node scripts/find-missing-translations.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type TranslationNode = Record<string, unknown>;

interface TranslationResources {
  [namespace: string]: TranslationNode;
}

interface SearchTarget {
  label: string;
  root: string;
}

interface Occurrence {
  file: string;
  relativeFile: string;
  lines: Set<number>;
  snippets: Map<number, string>;
}

interface MissingKeyRecord {
  key: string;
  namespace: string | null;
  keyPath: string;
  occurrences: Map<string, Occurrence>; // keyed by file path
}

interface Report {
  timestamp: string;
  translationRoot: string;
  namespaces: string[];
  directoriesScanned: string[];
  totals: {
    filesScanned: number;
    candidateKeysFound: number;
    uniqueMissingKeys: number;
  };
  missingKeys: Array<{
    key: string;
    namespace: string | null;
    keyPath: string;
    occurrences: Array<{
      file: string;
      lines: number[];
      snippets: Array<{ line: number; text: string }>;
    }>;
  }>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TRANSLATION_DIR = path.join(PROJECT_ROOT, 'packages/translations/locales/en');

const SEARCH_TARGETS: SearchTarget[] = [
  { label: 'frontend', root: path.join(PROJECT_ROOT, 'frontend') },
  { label: 'admin', root: path.join(PROJECT_ROOT, 'admin') },
];

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.turbo',
  '.next',
  '.git',
  'coverage',
  '.idea',
  '.vscode',
  '__tests__',
  '__mocks__',
  'tests',
  'test',
  'playwright',
  'e2e',
]);

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const T_CALL_PATTERN = /\bt\(\s*['"`]([^'"`]+)['"`]/g;
const I18N_KEY_PATTERN = /\bi18nKey\s*=\s*['"`]([^'"`]+)['"`]/g;
const PROPERTY_KEY_PATTERN = /\b([A-Za-z0-9_]+Key)\s*:\s*['"`]([^'"`]+)['"`]/g;
const CONST_KEY_PATTERN = /\bconst\s+([A-Za-z0-9_]+Key)\s*=\s*([^;]+);/g;
const STRING_LITERAL_PATTERN = /['"`]([^'"`]+)['"`]/g;

const TRANSLATION_KEY_FORMAT =
  /^([a-z][\w-]*:)?[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*)+$/;

const PROPERTY_KEY_WHITELIST = new Set([
  'labelKey',
  'textKey',
  'titleKey',
  'subtitleKey',
  'buttonKey',
  'messageKey',
  'descriptionKey',
  'helpTextKey',
  'tooltipKey',
  'valueKey',
  'ariaLabelKey',
  'nameKey',
  'ctaKey',
  'headerKey',
  'questionKey',
  'answerKey',
  'statKey',
  'statusKey',
  'sectionKey',
  'tabKey',
  'cardKey',
  'itemKey',
  'slideKey',
  'chipKey',
  'badgeKey',
  'optionKey',
  'stepKey',
  'fieldKey',
  'placeholderKey',
  'drawerKey',
  'modalKey',
  'summaryKey',
]);

const KNOWN_PREFIXES = new Set<string>();

function loadTranslations(): TranslationResources {
  if (!fs.existsSync(TRANSLATION_DIR)) {
    throw new Error(`Translation directory not found: ${TRANSLATION_DIR}`);
  }

  KNOWN_PREFIXES.clear();
  const resources: TranslationResources = {};
  const files = fs
    .readdirSync(TRANSLATION_DIR)
    .filter(file => file.endsWith('.json'));

  for (const file of files) {
    const namespace = path.basename(file, '.json');
    const filePath = path.join(TRANSLATION_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      resources[namespace] = JSON.parse(content);
      Object.keys(resources[namespace]).forEach(key => {
        KNOWN_PREFIXES.add(key);
      });
    } catch (error) {
      throw new Error(`Failed to parse ${file}: ${(error as Error).message}`);
    }
  }

  return resources;
}

function resolveTranslation(
  resources: TranslationResources,
  namespace: string,
  keyPath: string,
): boolean {
  const ns = resources[namespace];
  if (!ns) {
    return false;
  }

  const parts = keyPath.split('.');
  let current: unknown = ns;
  for (const part of parts) {
    if (
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      Object.prototype.hasOwnProperty.call(current, part)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }

  if (
    typeof current === 'string' ||
    typeof current === 'number' ||
    typeof current === 'boolean'
  ) {
    return true;
  }

  // Treat objects (e.g., nested groups without terminal value) as unresolved
  return false;
}

function keyExists(
  resources: TranslationResources,
  rawKey: string,
): { exists: boolean; namespace: string | null; keyPath: string } {
  if (rawKey.includes(':')) {
    const [namespace, keyPath] = rawKey.split(':', 2);
    const exists = resolveTranslation(resources, namespace, keyPath);
    return { exists, namespace, keyPath };
  }

  // Try default namespace first
  const defaultNamespace = 'common';
  if (resolveTranslation(resources, defaultNamespace, rawKey)) {
    return { exists: true, namespace: defaultNamespace, keyPath: rawKey };
  }

  // Fallback: check every namespace to see if the key exists anywhere
  for (const namespace of Object.keys(resources)) {
    if (namespace === defaultNamespace) {
      continue;
    }
    if (resolveTranslation(resources, namespace, rawKey)) {
      return { exists: true, namespace, keyPath: rawKey };
    }
  }

  return { exists: false, namespace: null, keyPath: rawKey };
}

function collectFiles(root: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(root);
  return results;
}

function extractCandidates(content: string): Array<{ key: string; index: number }> {
  const candidates: Array<{ key: string; index: number }> = [];

  const addCandidate = (key: string, index: number) => {
    if (!key || !key.includes('.') || key.includes('${')) {
      return;
    }
    if (!TRANSLATION_KEY_FORMAT.test(key)) {
      return;
    }
    if (!key.includes(':')) {
      const prefix = key.split('.')[0];
      if (!KNOWN_PREFIXES.has(prefix) && !/[A-Z]/.test(key)) {
        return;
      }
    }
    if (key.toLowerCase().startsWith('http')) {
      return;
    }
    candidates.push({ key, index });
  };

  let match: RegExpExecArray | null;

  while ((match = T_CALL_PATTERN.exec(content)) !== null) {
    addCandidate(match[1], match.index);
  }

  while ((match = I18N_KEY_PATTERN.exec(content)) !== null) {
    addCandidate(match[1], match.index);
  }

  while ((match = PROPERTY_KEY_PATTERN.exec(content)) !== null) {
    const propName = match[1];
    if (!PROPERTY_KEY_WHITELIST.has(propName)) {
      continue;
    }
    addCandidate(match[2], match.index);
  }

  while ((match = CONST_KEY_PATTERN.exec(content)) !== null) {
    const valueExpr = match[2];
    let stringMatch: RegExpExecArray | null;
    while ((stringMatch = STRING_LITERAL_PATTERN.exec(valueExpr)) !== null) {
      addCandidate(stringMatch[1], match.index + stringMatch.index);
    }
  }

  return candidates;
}

function ensureOccurrence(record: MissingKeyRecord, file: string, relative: string): Occurrence {
  if (!record.occurrences.has(file)) {
    record.occurrences.set(file, {
      file,
      relativeFile: relative,
      lines: new Set<number>(),
      snippets: new Map<number, string>(),
    });
  }
  return record.occurrences.get(file)!;
}

function addOccurrence(
  record: MissingKeyRecord,
  file: string,
  relativeFile: string,
  lineNumber: number,
  lineText: string,
): void {
  const occurrence = ensureOccurrence(record, file, relativeFile);
  occurrence.lines.add(lineNumber);
  if (!occurrence.snippets.has(lineNumber)) {
    occurrence.snippets.set(lineNumber, lineText.trim());
  }
}

function relativePath(file: string): string {
  return path.relative(PROJECT_ROOT, file);
}

function createReport(
  resources: TranslationResources,
  missing: Map<string, MissingKeyRecord>,
  filesScanned: number,
  candidateKeysFound: number,
): Report {
  return {
    timestamp: new Date().toISOString(),
    translationRoot: relativePath(TRANSLATION_DIR),
    namespaces: Object.keys(resources).sort(),
    directoriesScanned: SEARCH_TARGETS.map(target =>
      relativePath(target.root),
    ),
    totals: {
      filesScanned,
      candidateKeysFound,
      uniqueMissingKeys: missing.size,
    },
    missingKeys: Array.from(missing.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(record => ({
        key: record.key,
        namespace: record.namespace,
        keyPath: record.keyPath,
        occurrences: Array.from(record.occurrences.values())
          .sort((a, b) => a.relativeFile.localeCompare(b.relativeFile))
          .map(occurrence => ({
            file: occurrence.relativeFile,
            lines: Array.from(occurrence.lines).sort((a, b) => a - b),
            snippets: Array.from(occurrence.snippets.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([line, text]) => ({
                line,
                text,
              })),
          })),
      })),
  };
}

function main() {
  const resources = loadTranslations();

  const missing = new Map<string, MissingKeyRecord>();
  let candidateKeyCount = 0;
  let filesScanned = 0;

  for (const target of SEARCH_TARGETS) {
    if (!fs.existsSync(target.root)) {
      console.warn(`⚠️  Skipping missing directory: ${target.root}`);
      continue;
    }

    const files = collectFiles(target.root);
    filesScanned += files.length;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const rel = relativePath(file);
      const lines = content.split('\n');
      const candidates = extractCandidates(content);

      for (const candidate of candidates) {
        const rawKey = candidate.key;
        candidateKeyCount += 1;

        const { exists, namespace, keyPath } = keyExists(resources, rawKey);
        if (exists) {
          continue;
        }

        const keyId = namespace ? `${namespace}:${keyPath}` : rawKey;
        if (!missing.has(keyId)) {
          missing.set(keyId, {
            key: rawKey,
            namespace,
            keyPath,
            occurrences: new Map<string, Occurrence>(),
          });
        }

        const record = missing.get(keyId)!;

        const beforeIndex = content.slice(0, candidate.index);
        const lineNumber = beforeIndex.split('\n').length;
        const lineText = lines[lineNumber - 1] ?? '';

        addOccurrence(record, file, rel, lineNumber, lineText);
      }
    }
  }

  const report = createReport(resources, missing, filesScanned, candidateKeyCount);

  const outputPath = path.join(PROJECT_ROOT, 'missing-translations-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('🔎 Missing translation scan complete.\n');
  console.log(`   Directories scanned: ${report.directoriesScanned.join(', ')}`);
  console.log(`   Files scanned:       ${report.totals.filesScanned}`);
  console.log(`   Candidate keys:      ${report.totals.candidateKeysFound}`);
  console.log(`   Missing keys found:  ${report.totals.uniqueMissingKeys}`);
  console.log(`\n📝 Report written to ${relativePath(outputPath)}\n`);

  if (report.missingKeys.length > 0) {
    console.log('Top missing keys:');
    report.missingKeys.slice(0, 20).forEach(record => {
      const ns = record.namespace ? `${record.namespace}:` : '';
      const firstOccurrence = record.occurrences[0];
      const location =
        firstOccurrence && firstOccurrence.lines.length > 0
          ? `${firstOccurrence.file}:${firstOccurrence.lines[0]}`
          : 'unknown';
      console.log(`   - ${ns}${record.keyPath} (${location})`);
    });
    if (report.missingKeys.length > 20) {
      console.log(`   ... and ${report.missingKeys.length - 20} more`);
    }
  } else {
    console.log('✅ No missing translation keys detected!');
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Failed to complete missing translation scan.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

