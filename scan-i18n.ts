import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { globby } from "globby";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Finding = {
  file: string;
  line: number;
  column: number;
  kind: "JSXText" | "JSXProp" | "StringLiteral" | "TemplateLiteral";
  propName?: string;
  snippet: string;
  suggestion: string;
};

type MissingKey = {
  file?: string;        // where we saw it (first occurrence)
  line?: number;
  column?: number;
  key: string;          // "ns:key.path"
  localesMissing: string[];
};

type UnusedKey = {
  key: string;          // "ns:key.path"
  locales: string[];    // which locales have this key
  suggestion: string;
};

type CollectedKeyRef = {
  file: string;
  line: number;
  column: number;
  ns: string;
  key: string; // "key.path"
  full: string; // "ns:key.path"
};

const argv = yargs(hideBin(process.argv))
  .option("src", {
    type: "string",
    default: 'frontend/**/*.{ts,tsx,js,jsx}',
    describe: "Glob for files to scan (comma-separated allowed)",
  })
  .option("ignore", {
    type: "string",
    default:
      "node_modules/**,**/*.test.*," +
      "**/*.spec.*," +
      "**/__tests__/**," +
      "**/dist/**,**/build/**," +
      "**/.next/**,**/coverage/**," +
      "**/scan-i18n.ts",
    describe: "Ignore globs (comma-separated)",
  })
  .option("out", {
    type: "string",
    describe: "Write full JSON report to this path",
  })
  .option("report", {
    type: "string",
    choices: ["table", "json", "both"],
    default: "table",
    describe: "How to print the report to stdout",
  })
  .option("minLength", {
    type: "number",
    default: 3,
    describe: "Minimum text length to flag (hardcoded text)",
  })
  .option("props", {
    type: "string",
    default:
      "placeholder,title,alt,aria-label,ariaDescription,ariaTitle,label,helperText,caption,headline,buttonText,children,tooltip,emptyText",
    describe: "JSX props to inspect for literal strings (comma-separated)",
  })
  .option("i18nFns", {
    type: "string",
    default: "t,i18n.t,useTranslation().t",
    describe:
      "Function patterns that count as i18n-wrapped (comma-separated, simple names only except i18n.t special-cased)",
  })
  .option("i18nComponents", {
    type: "string",
    default: "Trans",
    describe: "Component names that make children safe (comma-separated)",
  })
  .option("locales", {
    type: "string",
    default: "frontend/public/locales",
    describe:
      "Root folder for locales. Expected structure: <locales>/<lang>/<namespace>.json",
  })
  .option("languages", {
    type: "string",
    default: "en,fr,de",
    describe: "Comma-separated list of languages to validate (e.g., en,fr,de)",
  })
  .option("namespaces", {
    type: "string",
    describe:
      "Optional comma-separated namespaces whitelist. If omitted, namespaces are inferred from JSON files present.",
  })
  .option("defaultNs", {
    type: "string",
    default: "translation",
    describe: "Default namespace when t('key') has no explicit ns",
  })
  .option("failOnMissing", {
    type: "boolean",
    default: false,
    describe: "Exit with code 2 if missing translation keys are found",
  })
  .option("checkUnused", {
    type: "boolean",
    default: true,
    describe: "Check for unused translation keys",
  })
  .help().argv as any;

const SRC_GLOBS = argv.src.split(",").map((s: string) => s.trim());
const IGNORE_GLOBS = argv.ignore.split(",").map((s: string) => s.trim());
const PROP_NAMES = new Set(
  argv.props
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
);
const I18N_COMPONENTS = new Set(
  argv.i18nComponents
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
);
const I18N_FN_NAMES = new Set(
  argv.i18nFns
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean)
);

const LOCALES_ROOT = path.resolve(String(argv.locales));
const LANGS: string[] = String(argv.languages)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_NS: string = String(argv.defaultNs);

let NAMESPACES: string[] =
  argv.namespaces
    ?.split(",")
    .map((s: string) => s.trim())
    .filter(Boolean) ?? [];

/** Heuristics to skip literals that are probably not user-facing text */
const NON_TEXT_REGEXES: RegExp[] = [
  /^\s*$/, // whitespace
  /^[0-9.,:;!?%+*/<>=(){}[\]_'"`-]+$/, // only punctuation/numbers
  /^https?:\/\//i, // urls
  /^[\w.-]+@[\w.-]+\.\w+$/, // emails
  /^#?[0-9A-Fa-f]{6}$/, // hex color
  /^[A-Za-z0-9_-]{1,20}$/, // short ids/keys
];

function looksNonText(s: string, minLen: number) {
  if (s.length < minLen) return true;
  return NON_TEXT_REGEXES.some((re) => re.test(s));
}

function hasI18nIgnoreComment(comments?: (t.Comment | null)[]) {
  if (!comments) return false;
  return comments.some((c) => c && /i18n-ignore/.test(c.value));
}

function isInsideTrans(path: NodePath) {
  let p: NodePath | null = path;
  while (p) {
    if (p.isJSXElement()) {
      const opening = p.node.openingElement;
      const name = opening.name;
      if (t.isJSXIdentifier(name) && I18N_COMPONENTS.has(name.name)) return true;
    }
    p = p.parentPath;
  }
  return false;
}

function isArgOfI18nFn(path: NodePath<t.StringLiteral | t.TemplateLiteral>) {
  const parent = path.parentPath;
  if (!parent?.isCallExpression()) return false;
  const callee = parent.node.callee;

  if (t.isIdentifier(callee) && I18N_FN_NAMES.has(callee.name)) return true;

  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object) &&
    t.isIdentifier(callee.property) &&
    callee.object.name === "i18n" &&
    callee.property.name === "t"
  ) {
    return true;
  }
  return false;
}

function getLoc(node: t.Node) {
  const l = node.loc;
  return {
    line: l?.start.line ?? 0,
    column: l?.start.column ?? 0,
  };
}

function snippetFrom(source: string, line: number): string {
  const lines = source.split(/\r?\n/);
  const i = Math.max(0, line - 1);
  return (lines[i] || "").trim().slice(0, 180);
}

function textFromTemplateLiteral(node: t.TemplateLiteral): string {
  if (node.expressions.length > 0) return ""; // only static templates
  return node.quasis.map((q) => q.value.cooked ?? q.value.raw ?? "").join("");
}

/** ---------- Locale loading / flattening ---------- */

type LocaleMap = Map<string, Set<string>>; // ns => set of keys (key.path)

function flattenJSON(obj: any, prefix = ""): string[] {
  const keys: string[] = [];
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      const p = prefix ? `${prefix}.${k}` : k;
      if (val && typeof val === "object") {
        keys.push(...flattenJSON(val, p));
      } else {
        keys.push(p);
      }
    }
  }
  return keys;
}

function loadNamespacesFromDisk(): string[] {
  const set = new Set<string>();
  for (const lang of LANGS) {
    const dir = path.join(LOCALES_ROOT, lang);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      set.add(path.basename(f, ".json"));
    }
  }
  return [...set].sort();
}

function loadLocales(): Record<string, LocaleMap> {
  // locales[lang] => Map(ns => Set(keys))
  const locales: Record<string, LocaleMap> = {};
  if (NAMESPACES.length === 0) {
    NAMESPACES = loadNamespacesFromDisk();
  }

  for (const lang of LANGS) {
    const nsMap: LocaleMap = new Map();
    for (const ns of NAMESPACES) {
      const file = path.join(LOCALES_ROOT, lang, `${ns}.json`);
      if (!fs.existsSync(file)) {
        nsMap.set(ns, new Set()); // missing file => empty keys
        continue;
      }
      try {
        const raw = fs.readFileSync(file, "utf8");
        const json = JSON.parse(raw);
        const flattened = flattenJSON(json);
        nsMap.set(ns, new Set(flattened));
      } catch (e) {
        console.error(`[locale-parse-failed] ${file}: ${(e as Error).message}`);
        nsMap.set(ns, new Set());
      }
    }
    locales[lang] = nsMap;
  }
  return locales;
}

/** ---------- Scan code ---------- */

async function run() {
  const files = await globby(SRC_GLOBS, { ignore: IGNORE_GLOBS });

  const hardcoded: Finding[] = [];
  const keyRefs: CollectedKeyRef[] = [];

  for (const file of files) {
    let code: string;
    try {
      code = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (/i18n-ignore-file/.test(code)) continue;

    let ast: t.File;
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "classProperties",
          "decorators-legacy",
          "objectRestSpread",
          "topLevelAwait",
          "dynamicImport",
        ],
      });
    } catch (err) {
      console.error(`[parse-failed] ${file}: ${(err as Error).message}`);
      continue;
    }

    traverse(ast, {
      enter(p) {
        if (hasI18nIgnoreComment((p.node as any).leadingComments)) return;

        /** A) Hardcoded text checks */

        // 1) JSXText
        if (p.isJSXText()) {
          const raw = p.node.value;
          const text = raw.replace(/\s+/g, " ").trim();
          if (!text) return;
          if (isInsideTrans(p)) return;
          if (looksNonText(text, argv.minLength)) return;
          const { line, column } = getLoc(p.node);
          hardcoded.push({
            file,
            line,
            column,
            kind: "JSXText",
            snippet: snippetFrom(code, line),
            suggestion: `Wrap with <Trans>...</Trans> or replace with {t("${DEFAULT_NS}:your.key")}.`,
          });
        }

        // 2) JSXAttribute stringy props
        if (p.isJSXAttribute()) {
          const nameNode = p.node.name;
          if (!t.isJSXIdentifier(nameNode)) return;
          const propName = nameNode.name;
          if (!PROP_NAMES.has(propName)) return;
          const val = p.node.value;
          if (!val) return;

          const pushFinding = (node: t.Node) => {
            const { line, column } = getLoc(node);
            hardcoded.push({
              file,
              line,
              column,
              kind: "JSXProp",
              propName,
              snippet: snippetFrom(code, line),
              suggestion: `Use {t("${DEFAULT_NS}:your.key")} or <Trans> for "${propName}".`,
            });
          };

          if (t.isStringLiteral(val)) {
            const text = val.value.trim();
            if (text && !looksNonText(text, argv.minLength)) pushFinding(p.node);
          } else if (t.isJSXExpressionContainer(val)) {
            const expr = val.expression;
            if (t.isStringLiteral(expr)) {
              const text = expr.value.trim();
              if (text && !looksNonText(text, argv.minLength)) pushFinding(p.node);
            } else if (t.isTemplateLiteral(expr)) {
              const text = textFromTemplateLiteral(expr).trim();
              if (text && !looksNonText(text, argv.minLength)) pushFinding(p.node);
            }
          }
        }

        // 3) Suspicious string/template used in UI-ish places
        if (p.isStringLiteral() || p.isTemplateLiteral()) {
          // skip if part of JSX attr or element
          if (
            p.parentPath?.isJSXAttribute() ||
            p.parentPath?.isJSXElement() ||
            p.isJSXAttribute() ||
            p.isJSXElement()
          )
            return;

          // skip if arg of t(...)
          if (isArgOfI18nFn(p as any)) return;

          if (p.isTemplateLiteral() && p.node.expressions.length > 0) return;

          const raw =
            p.isStringLiteral()
              ? p.node.value
              : textFromTemplateLiteral(p.node);
          const text = (raw || "").trim();
          if (!text || looksNonText(text, argv.minLength)) return;

          // heuristic: keys like label/title/text/etc
          const propLikeNames = new Set([
            "label",
            "text",
            "title",
            "caption",
            "helperText",
            "emptyText",
            "buttonText",
            "subtitle",
            "description",
            "tooltip",
            "errorMessage",
            "successMessage",
            "message",
            "cta",
            "placeholder",
            "heading",
          ]);

          let suspicious = false;

          if (p.parentPath?.isObjectProperty()) {
            const key = p.parentPath.node.key;
            if (t.isIdentifier(key) && propLikeNames.has(key.name)) suspicious = true;
            if (t.isStringLiteral(key) && propLikeNames.has(key.value)) suspicious = true;
          }

          if (!suspicious && p.parentPath?.isCallExpression()) {
            const callee = p.parentPath.node.callee;
            if (t.isIdentifier(callee)) {
              const name = callee.name.toLowerCase();
              if (["toast", "notify", "alert", "message", "snackbar"].some((n) => name.includes(n))) {
                suspicious = true;
              }
            }
          }

          if (!suspicious && p.parentPath?.isVariableDeclarator()) {
            const id = p.parentPath.node.id;
            if (t.isIdentifier(id)) {
              const name = id.name.toLowerCase();
              if (["label", "text", "title", "caption", "heading"].some((n) => name.includes(n))) {
                suspicious = true;
              }
            }
          }

          if (suspicious) {
            const { line, column } = getLoc(p.node);
            hardcoded.push({
              file,
              line,
              column,
              kind: p.isStringLiteral() ? "StringLiteral" : "TemplateLiteral",
              snippet: snippetFrom(code, line),
              suggestion: 'Replace with t("ns:key") or pass a translated value.',
            });
          }
        }

        /** B) Key collection for missing-key checks */

        // t("...") / i18n.t("...") with optional ns in arg or options
        if (p.isCallExpression()) {
          const callee = p.node.callee;

          const isT =
            (t.isIdentifier(callee) && I18N_FN_NAMES.has(callee.name)) ||
            (t.isMemberExpression(callee) &&
              t.isIdentifier(callee.object, { name: "i18n" }) &&
              t.isIdentifier(callee.property, { name: "t" }));

          if (!isT) return;

          const [arg0, arg1] = p.node.arguments;

          if (arg0 && t.isStringLiteral(arg0)) {
            let rawKey = arg0.value; // "ns:key.path" OR "key.path"
            let ns = DEFAULT_NS;
            let key = rawKey;

            // Check for "ns:key"
            const idx = rawKey.indexOf(":");
            if (idx > 0) {
              ns = rawKey.slice(0, idx);
              key = rawKey.slice(idx + 1);
            } else {
              // Maybe options { ns: 'x' }
              if (arg1 && t.isObjectExpression(arg1)) {
                for (const prop of arg1.properties) {
                  if (t.isObjectProperty(prop)) {
                    const k = prop.key;
                    if ((t.isIdentifier(k) && k.name === "ns") || (t.isStringLiteral(k) && k.value === "ns")) {
                      if (t.isStringLiteral(prop.value)) ns = prop.value.value;
                    }
                  }
                }
              }
            }

            const { line, column } = getLoc(p.node);
            keyRefs.push({
              file,
              line,
              column,
              ns,
              key,
              full: `${ns}:${key}`,
            });
          }
        }

        // <Trans i18nKey="..."/>
        if (p.isJSXOpeningElement()) {
          const name = p.node.name;
          if (!t.isJSXIdentifier(name) || !I18N_COMPONENTS.has(name.name)) return;

          const attr = p.node.attributes.find(
            (a) => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: "i18nKey" })
          ) as t.JSXAttribute | undefined;

          if (!attr) return;

          if (attr.value && t.isStringLiteral(attr.value)) {
            const rawKey = attr.value.value;
            let ns = DEFAULT_NS;
            let key = rawKey;
            const idx = rawKey.indexOf(":");
            if (idx > 0) {
              ns = rawKey.slice(0, idx);
              key = rawKey.slice(idx + 1);
            }
            const { line, column } = getLoc(p.node);
            keyRefs.push({
              file,
              line,
              column,
              ns,
              key,
              full: `${ns}:${key}`,
            });
          }
        }
      },
    });
  }

  /** Load locales and compute missing keys */
  const locales = loadLocales();
  const missing: MissingKey[] = [];
  const unused: UnusedKey[] = [];

  const seen = new Set<string>(); // de-duplicate by ns:key
  for (const ref of keyRefs) {
    if (seen.has(ref.full)) continue;
    seen.add(ref.full);

    const missingLangs: string[] = [];
    for (const lang of LANGS) {
      const nsMap = locales[lang];
      const set = nsMap?.get(ref.ns);
      if (!set || !set.has(ref.key)) {
        missingLangs.push(lang);
      }
    }
    if (missingLangs.length > 0) {
      missing.push({
        file: ref.file,
        line: ref.line,
        column: ref.column,
        key: ref.full,
        localesMissing: missingLangs,
      });
    }
  }

  /** C) Find unused keys */
  if (argv.checkUnused) {
    const usedKeys = new Set(keyRefs.map(ref => ref.full));
    
    for (const lang of LANGS) {
      const nsMap = locales[lang];
      for (const [ns, keys] of nsMap) {
        for (const key of keys) {
          const fullKey = `${ns}:${key}`;
          if (!usedKeys.has(fullKey)) {
            // Check if this key exists in other locales too
            const localesWithKey = LANGS.filter(l => {
              const otherNsMap = locales[l];
              const otherKeys = otherNsMap?.get(ns);
              return otherKeys?.has(key) ?? false;
            });
            
            if (localesWithKey.length > 0) {
              unused.push({
                key: fullKey,
                locales: localesWithKey,
                suggestion: `Remove unused key "${key}" from namespace "${ns}" in ${localesWithKey.join(', ')}`
              });
            }
          }
        }
      }
    }
  }

  /** Output */
  const sortByFileLine = <T extends { file?: string; line?: number }>(arr: T[]) =>
    arr.sort((a, b) => {
      const fa = a.file || "";
      const fb = b.file || "";
      if (fa !== fb) return fa.localeCompare(fb);
      return (a.line || 0) - (b.line || 0);
    });

  const hardcodedSorted = sortByFileLine(hardcoded);
  const missingSorted = sortByFileLine(missing);
  const unusedSorted = unused.sort((a, b) => a.key.localeCompare(b.key));

  const printTable = () => {
    const maxFile = Math.min(
      50,
      Math.max(...hardcodedSorted.map((r) => r.file.length).concat(missingSorted.map((m) => (m.file || "").length), [10]))
    );
    const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s).padEnd(n, " ");

    console.log(`\n=== i18n scan results ===`);
    console.log(`Hardcoded text: ${hardcodedSorted.length}`);
    console.log(`Missing keys:   ${missingSorted.length}`);
    console.log(`Unused keys:    ${unusedSorted.length}\n`);

    if (hardcodedSorted.length) {
      console.log(`-- Hardcoded Text --`);
      console.log(pad("FILE", maxFile), pad("LINE", 6), pad("KIND", 18), "SNIPPET");
      console.log("-".repeat(maxFile + 6 + 18 + 10));
      for (const r of hardcodedSorted) {
        const kind = r.kind + (r.propName ? `(${r.propName})` : "");
        console.log(pad(r.file, maxFile), pad(String(r.line), 6), pad(kind, 18), r.snippet);
      }
      console.log("");
    }

    if (missingSorted.length) {
      console.log(`-- Missing Keys --`);
      console.log(pad("FILE", maxFile), pad("LINE", 6), pad("KEY (ns:key)", 40), "LOCALES MISSING");
      console.log("-".repeat(maxFile + 6 + 40 + 18));
      for (const m of missingSorted) {
        console.log(
          pad(m.file || "-", maxFile),
          pad(String(m.line || "-"), 6),
          pad(m.key, 40),
          m.localesMissing.join(", ")
        );
      }
      console.log("");
    }

    if (unusedSorted.length) {
      console.log(`-- Unused Keys --`);
      console.log(pad("KEY (ns:key)", 50), "LOCALES");
      console.log("-".repeat(50 + 20));
      for (const u of unusedSorted) {
        console.log(pad(u.key, 50), u.locales.join(", "));
      }
      console.log("");
    }
  };

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    summary: {
      hardcodedCount: hardcodedSorted.length,
      missingKeyCount: missingSorted.length,
      unusedKeyCount: unusedSorted.length,
      langs: LANGS,
      defaultNs: DEFAULT_NS,
      namespaces: NAMESPACES,
      localesRoot: LOCALES_ROOT,
    },
    hardcoded: hardcodedSorted,
    missingKeys: missingSorted,
    unusedKeys: unusedSorted,
  };

  if (argv.report === "table" || argv.report === "both") printTable();
  if (argv.report === "json" || argv.report === "both") {
    console.log(JSON.stringify(jsonPayload, null, 2));
  }

  if (argv.out) {
    fs.writeFileSync(path.resolve(argv.out), JSON.stringify(jsonPayload, null, 2), "utf8");
    console.log(`Report saved to: ${path.resolve(argv.out)}`);
  }

  if (argv.failOnMissing && missingSorted.length > 0) {
    process.exit(2);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});