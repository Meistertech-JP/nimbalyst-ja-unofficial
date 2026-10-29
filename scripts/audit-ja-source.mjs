#!/usr/bin/env node
/**
 * Read-only Japanese localization and publication audit.
 * Reports facts and candidate strings; it deliberately does not decide whether
 * an English candidate is intentional or user-facing.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { isTextLikePath } from './check-text-file-nuls.mjs';

export const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESOURCE_ROOT = 'packages/i18n/src/resources';
const SOURCE_ROOTS = [
  'packages/electron/src', 'packages/runtime/src', 'packages/collab-client/src',
  'packages/extensions', 'packages/cli/src', 'packages/wiki-web/src',
];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage', 'build', '__tests__', '__mocks__', 'generated']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ATTR_NAMES = new Set(['title', 'aria-label', 'aria-description', 'aria-placeholder', 'placeholder', 'alt']);
const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
const INTENTIONAL_EMPTY_WHITESPACE = new Set(['common.local_wiki.export.note_separator']);

function walkFiles(root, relativeDir = '') {
  const abs = path.join(root, relativeDir);
  if (!exists(abs)) return [];
  const found = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = path.posix.join(relativeDir.split(path.sep).join('/'), entry.name).replace(/^\//, '');
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) found.push(...walkFiles(root, rel));
    } else if (entry.isFile()) found.push(rel);
  }
  return found;
}

function exists(file) {
  try { return statSync(file).isDirectory() || statSync(file).isFile(); } catch { return false; }
}

function flattenLeaves(value, prefix = '', out = new Map()) {
  if (typeof value === 'string') out.set(prefix, value);
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flattenLeaves(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort();
}

export function classifyUntrackedPath(file) {
  const p = file.replaceAll('\\', '/');
  if (p === 'scripts/audit-ja-source.mjs') return 'audit-tooling';
  if (p === 'scripts/__tests__/audit-ja-source.test.mjs') return 'audit-test';
  if (p === 'packages/collab-bundle/scripts/write-declaration.mjs' || p === 'packages/electron/build/electron-abi-probe.js') return 'implementation';
  if (p.startsWith('packages/collab-bundle/types/')) return 'generated-type-output';
  if (p === 'packages/i18n/src/resources/index.ts' || /^packages\/i18n\/src\/resources\/(en|ja)\/.*\.json$/.test(p)) return 'i18n-resource';
  if (/^README(?:\.en)?\.md$/i.test(p) || /^RELEASE_NOTES.*\.md$/i.test(p)) return 'publication-document';
  if (p === 'docs/UNOFFICIAL_RELEASE.md') return 'publication-document';
  if (/(^|\/)(__tests__|tests)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) return 'test';
  if (/^packages\/.+\/src\//.test(p)) return 'implementation';
  if (/^packages\/[^/]+\/(?:package\.json|tsconfig(?:\.build)?\.json)$/.test(p)) return 'package-configuration';
  return 'unclassified';
}

export function publicationDecision(classification, file = '') {
  const normalizedPath = file.replaceAll('\\', '/');
  if (normalizedPath === 'packages/collab-bundle/scripts/write-declaration.mjs' || normalizedPath === 'packages/electron/build/electron-abi-probe.js') {
    return { decision: 'include', reason: 'Build/validation helper imported by tracked scripts; source is required and is not generated output.' };
  }
  const decisions = {
    'audit-tooling': ['include', 'Read-only source audit used to reproduce the localization and publication checks.'],
    'audit-test': ['include', 'Focused regression tests for the read-only source audit.'],
    'generated-type-output': ['exclude', 'Generated declaration output is reproduced by the collab-bundle types build; keep source build inputs instead.'],
    'i18n-resource': ['include', 'English/Japanese resource source required by the localized application.'],
    'publication-document': ['include', 'Publication document explicitly included in the public source package.'],
    'test': ['include', 'Source test coverage for localized UI or the affected component behavior.'],
    'implementation': ['include', 'Runtime source required for localization behavior.'],
    'package-configuration': ['include', 'Package configuration required to build and typecheck the i18n package.'],
    'package-build-tool': ['include', 'Build helper imported by a tracked package build/validation script; it is source, not generated output.'],
    'internal-release-process': ['exclude', 'Internal branch/history and release workflow notes are not public end-user documentation.'],
  };
  const [decision, reason] = decisions[classification] ?? ['review', 'No publication rule matched; require an explicit owner decision.'];
  return { decision, reason };
}

function flattenedResources(root) {
  const base = path.join(root, RESOURCE_ROOT);
  const namespaces = { en: new Map(), ja: new Map() };
  for (const locale of ['en', 'ja']) {
    const localeRoot = path.join(base, locale);
    for (const file of readdirSync(localeRoot).filter((name) => name.endsWith('.json')).sort()) {
      const namespace = file.slice(0, -5);
      const leaves = flattenLeaves(JSON.parse(readFileSync(path.join(localeRoot, file), 'utf8')));
      namespaces[locale].set(namespace, leaves);
    }
  }
  return namespaces;
}

function resourceAudit(resources) {
  const enNs = resources.en;
  const jaNs = resources.ja;
  const namespaceDifference = {
    onlyEn: [...enNs.keys()].filter((key) => !jaNs.has(key)).sort(),
    onlyJa: [...jaNs.keys()].filter((key) => !enNs.has(key)).sort(),
  };
  const parity = [];
  const emptyJapanese = [];
  const placeholderDifferences = [];
  let enKeyCount = 0;
  let jaKeyCount = 0;
  for (const [ns, leaves] of enNs) {
    enKeyCount += leaves.size;
  }
  for (const [ns, leaves] of jaNs) {
    jaKeyCount += leaves.size;
    for (const [key, value] of leaves) {
      if (!value.trim()) emptyJapanese.push({ key: `${ns}.${key}`, intentionalWhitespace: INTENTIONAL_EMPTY_WHITESPACE.has(`${ns}.${key}`) && value === ' ' });
    }
  }
  for (const ns of new Set([...enNs.keys(), ...jaNs.keys()])) {
    const en = enNs.get(ns) ?? new Map();
    const ja = jaNs.get(ns) ?? new Map();
    for (const key of new Set([...en.keys(), ...ja.keys()])) {
      if (!en.has(key)) parity.push(`onlyJa:${ns}.${key}`);
      else if (!ja.has(key)) parity.push(`onlyEn:${ns}.${key}`);
      else if (JSON.stringify(placeholders(en.get(key))) !== JSON.stringify(placeholders(ja.get(key)))) {
        placeholderDifferences.push({ key: `${ns}.${key}`, en: placeholders(en.get(key)), ja: placeholders(ja.get(key)) });
      }
    }
  }
  return {
    namespaceCount: { en: enNs.size, ja: jaNs.size },
    namespaces: { en: [...enNs.keys()].sort(), ja: [...jaNs.keys()].sort() },
    keyCount: { en: enKeyCount, ja: jaKeyCount },
    namespaceDifference,
    keyParityDifferences: parity.sort(),
    emptyValues: emptyJapanese.sort((a, b) => a.key.localeCompare(b.key)),
    placeholderDifferences,
  };
}

function existingKeyCountContract(root) {
  const testFile = path.join(root, 'packages/i18n/src/__tests__/core.test.ts');
  const source = readFileSync(testFile, 'utf8');
  const match = source.match(/expect\(totalKeys\)\.toBe\((\d+)\)/);
  return match ? Number(match[1]) : null;
}

function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function finiteStringValues(node, limit = 32) {
  const value = literal(node);
  if (value !== undefined) return [value];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)) {
    return finiteStringValues(node.expression, limit);
  }
  let values;
  if (ts.isConditionalExpression(node)) {
    const whenTrue = finiteStringValues(node.whenTrue, limit);
    const whenFalse = finiteStringValues(node.whenFalse, limit);
    if (!whenTrue || !whenFalse) return undefined;
    values = [...whenTrue, ...whenFalse];
  } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = finiteStringValues(node.left, limit);
    const right = finiteStringValues(node.right, limit);
    if (!left || !right || left.length * right.length > limit) return undefined;
    values = left.flatMap((a) => right.map((b) => a + b));
  } else {
    return undefined;
  }
  const unique = [...new Set(values)];
  return unique.length > 0 && unique.length <= limit ? unique : undefined;
}

function walkNodes(root, predicate) {
  const matches = [];
  function visit(node) {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

export function resolveTranslationKey(key, explicitNamespace, defaultNamespace = 'common') {
  if (typeof key !== 'string') return { namespace: explicitNamespace ?? defaultNamespace, key: undefined };
  const separator = key.indexOf(':');
  if (separator > 0) return { namespace: key.slice(0, separator), key: key.slice(separator + 1) };
  return { namespace: explicitNamespace ?? defaultNamespace, key };
}

function scanFileReferences(root, relativeFile, resources) {
  const sourcePath = path.join(root, relativeFile);
  const source = readFileSync(sourcePath, 'utf8');
  const kind = relativeFile.endsWith('.tsx') ? ts.ScriptKind.TSX
    : relativeFile.endsWith('.jsx') ? ts.ScriptKind.JSX
      : /\.tsx?$/.test(relativeFile) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, kind);
  const hookNamespaces = new Set();
  const hookPrefixes = new Set();
  const typedNamespaces = new Set();
  const typedNamespaceAliases = new Map();
  const translatorBindings = new Map();
  const references = [];
  const candidates = [];
  const dynamicReferences = [];
  const lineAt = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  function gatherHooks(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useTranslation') {
      hookNamespaces.add(literal(node.arguments[0]) ?? 'common');
      const options = node.arguments.find(ts.isObjectLiteralExpression);
      const prefixProperty = options?.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(sf) === 'keyPrefix');
      hookPrefixes.add(prefixProperty && ts.isPropertyAssignment(prefixProperty) ? literal(prefixProperty.initializer) ?? '' : '');
    }
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === 'useTranslation' && ts.isObjectBindingPattern(node.name)) {
      const call = node.initializer;
      const nsArg = call.arguments[0];
      const ns = literal(nsArg) ?? 'common';
      const options = call.arguments.find(ts.isObjectLiteralExpression);
      const prefixProperty = options?.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(sf) === 'keyPrefix');
      const prefix = prefixProperty && ts.isPropertyAssignment(prefixProperty) ? literal(prefixProperty.initializer) ?? '' : '';
      for (const element of node.name.elements) {
        if ((element.propertyName ?? element.name).getText(sf) !== 't' || !ts.isIdentifier(element.name)) continue;
        const contexts = translatorBindings.get(element.name.text) ?? [];
        contexts.push({ namespace: ns, prefix });
        translatorBindings.set(element.name.text, contexts);
      }
    }
    if (ts.isTypeAliasDeclaration(node)) {
      for (const child of walkNodes(node.type, (candidate) => ts.isTypeReferenceNode(candidate) && candidate.typeName.getText(sf).split('.').at(-1) === 'TFunction')) {
        const ns = child.typeArguments?.[0];
        if (ns && ts.isLiteralTypeNode(ns) && ts.isStringLiteral(ns.literal)) typedNamespaceAliases.set(node.name.text, ns.literal.text);
      }
    }
    if (ts.isTypeReferenceNode(node) && node.typeName.getText(sf).split('.').at(-1) === 'TFunction') {
      const ns = node.typeArguments?.[0];
      if (ns && ts.isLiteralTypeNode(ns) && ts.isStringLiteral(ns.literal)) typedNamespaces.add(ns.literal.text);
    }
    if (ts.isParameter(node) && node.name && ts.isIdentifier(node.name) && /^t(?:[A-Z].*)?$/.test(node.name.text) && node.type && ts.isTypeReferenceNode(node.type)) {
      const typeName = node.type.typeName.getText(sf).split('.').at(-1);
      const directNs = node.type.typeArguments?.[0];
      if (directNs && ts.isLiteralTypeNode(directNs) && ts.isStringLiteral(directNs.literal)) typedNamespaces.add(directNs.literal.text);
      else if (typedNamespaceAliases.has(typeName)) typedNamespaces.add(typedNamespaceAliases.get(typeName));
    }
    ts.forEachChild(node, gatherHooks);
  }
  gatherHooks(sf);

  function visit(node) {
    if (ts.isCallExpression(node) && (ts.isIdentifier(node.expression) || ts.isPropertyAccessExpression(node.expression))) {
      const callee = ts.isIdentifier(node.expression) ? node.expression.text : node.expression.name.text;
      if (/^t(?:[A-Z][A-Za-z0-9_]*)?$/.test(callee) && node.arguments.length > 0) {
        const keys = finiteStringValues(node.arguments[0]);
        if (keys === undefined) dynamicReferences.push({
          file: relativeFile,
          line: lineAt(node),
          kind: 't-call',
          expressionKind: ts.SyntaxKind[node.arguments[0].kind],
          hookNamespaces: [...hookNamespaces].sort(),
        });
        else for (const key of keys) {
          let namespace;
          let hasDefaultValue = false;
          for (let i = 1; i < node.arguments.length; i++) {
            const arg = node.arguments[i];
            if (ts.isObjectLiteralExpression(arg)) {
              const nsProp = arg.properties.find((p) => ts.isPropertyAssignment(p) && p.name?.getText(sf) === 'ns');
              if (nsProp && ts.isPropertyAssignment(nsProp)) namespace = literal(nsProp.initializer) ?? namespace;
              hasDefaultValue ||= arg.properties.some((p) => ts.isPropertyAssignment(p) && p.name?.getText(sf) === 'defaultValue');
            }
          }
          const keyResolution = resolveTranslationKey(key, namespace);
          const bindingContexts = ts.isIdentifier(node.expression) ? translatorBindings.get(node.expression.text) ?? [] : [];
          const suffixNamespace = /^t([A-Z].*)$/.exec(callee)?.[1];
          const namedNamespace = suffixNamespace && [...resources.en.keys()].find((ns) => ns.toLowerCase() === suffixNamespace.toLowerCase());
          const inferredNamespaces = bindingContexts.length ? [...new Set(bindingContexts.map((context) => context.namespace))]
            : namedNamespace ? [namedNamespace]
              : hookNamespaces.size ? [...hookNamespaces]
                : typedNamespaces.size ? [...typedNamespaces] : [];
          const candidatesNs = namespace || key.includes(':') ? [keyResolution.namespace] : inferredNamespaces;
          const prefixes = bindingContexts.length ? [...new Set(bindingContexts.map((context) => context.prefix))] : [...hookPrefixes];
          references.push({ file: relativeFile, line: lineAt(node), key: keyResolution.key, namespaces: candidatesNs, prefixes, explicitNamespace: Boolean(namespace || key.includes(':')), hasDefaultValue, scopeAmbiguous: !namespace && !key.includes(':') && (bindingContexts.length > 1 || (!bindingContexts.length && (hookNamespaces.size > 1 || hookPrefixes.size > 1 || typedNamespaces.size > 1))) });
        }
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const i18nKeyAttr = node.attributes.properties.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(sf) === 'i18nKey');
      const nsAttr = node.attributes.properties.find((attr) => ts.isJsxAttribute(attr) && attr.name.getText(sf) === 'ns');
      const i18nKey = i18nKeyAttr && ts.isJsxAttribute(i18nKeyAttr) && i18nKeyAttr.initializer && ts.isStringLiteral(i18nKeyAttr.initializer)
        ? i18nKeyAttr.initializer.text
        : undefined;
      if (i18nKey) {
        const ns = nsAttr && ts.isJsxAttribute(nsAttr) && nsAttr.initializer && ts.isStringLiteral(nsAttr.initializer)
          ? nsAttr.initializer.text
          : undefined;
        const keyResolution = resolveTranslationKey(i18nKey, ns);
        const candidatesNs = ns || i18nKey.includes(':') ? [keyResolution.namespace] : hookNamespaces.size ? [...hookNamespaces] : [keyResolution.namespace];
        references.push({ file: relativeFile, line: lineAt(i18nKeyAttr), key: keyResolution.key, namespaces: candidatesNs, prefixes: [...hookPrefixes], explicitNamespace: Boolean(ns || i18nKey.includes(':')), hasDefaultValue: false, scopeAmbiguous: !ns && !i18nKey.includes(':') && (hookNamespaces.size > 1 || hookPrefixes.size > 1) });
      } else if (i18nKeyAttr) dynamicReferences.push({ file: relativeFile, line: lineAt(i18nKeyAttr), kind: 'Trans-i18nKey' });
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !ATTR_NAMES.has(attr.name.getText(sf))) continue;
        const value = attr.initializer && ts.isStringLiteral(attr.initializer)
          ? attr.initializer.text
          : attr.initializer && ts.isJsxExpression(attr.initializer) && attr.initializer.expression && ts.isStringLiteral(attr.initializer.expression)
            ? attr.initializer.expression.text
            : undefined;
        if (value && !CJK.test(value) && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(value)) {
          candidates.push({ file: relativeFile, line: lineAt(attr), kind: `jsx-${attr.name.getText(sf)}`, text: value });
        }
      }
    }
    if (ts.isJsxText(node) && !CJK.test(node.text) && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(node.text)) {
      candidates.push({ file: relativeFile, line: lineAt(node), kind: 'jsx-text', text: node.text.trim().replace(/\s+/g, ' ').slice(0, 200) });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return { references, candidates, dynamicReferences };
}

function auditReferences(root, resources) {
  const files = SOURCE_ROOTS.flatMap((sourceRoot) => walkFiles(root, sourceRoot))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .filter((file) => !/\.(test|spec)\.[cm]?[jt]sx?$/.test(file));
  const missing = [];
  const unresolvedScope = [];
  const candidates = [];
  const dynamic = [];
  let literalCount = 0;
  for (const file of files) {
    const scan = scanFileReferences(root, file, resources);
    candidates.push(...scan.candidates);
    dynamic.push(...scan.dynamicReferences);
    for (const ref of scan.references) {
      literalCount++;
      if (ref.namespaces.length === 0) {
        unresolvedScope.push(ref);
        continue;
      }
      const found = ref.namespaces.some((ns) => {
        const namespace = resources.en.get(ns);
        if (!namespace) return false;
        const prefixCandidates = ref.prefixes?.length ? ref.prefixes : [''];
        return prefixCandidates.some((prefix) => {
          const key = prefix ? `${prefix}.${ref.key}` : ref.key;
          return namespace.has(key) || ['zero', 'one', 'two', 'few', 'many', 'other'].some((suffix) => namespace.has(`${key}_${suffix}`));
        });
      });
      if (!found) missing.push(ref);
    }
  }
  return { sourceFileCount: files.length, literalReferenceCount: literalCount, missingLiteralReferences: missing, defaultValueFallbackCount: missing.filter((ref) => ref.hasDefaultValue).length, ambiguousScopeReferenceCount: missing.filter((ref) => ref.scopeAmbiguous).length, unresolvedScopeReferenceCount: unresolvedScope.length, unresolvedScopeReferences: unresolvedScope, dynamicReferenceCount: dynamic.length, dynamicReferences: dynamic, astEnglishCandidates: candidates };
}

function git(root, args) {
  // Retained package candidates can make the untracked inventory exceed Node's
  // default 1 MiB buffer. Keep the full inventory rather than truncating it.
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function publicationInventory(root) {
  const paths = git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).sort();
  return paths.map((file) => {
    const classification = classifyUntrackedPath(file);
    return { path: file, classification, ...publicationDecision(classification, file) };
  });
}

const SECRET_PATTERNS = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['cloud-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ['openai-key', /\bsk-[A-Za-z0-9_-]{24,}\b/g],
  ['generic-secret-assignment', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password)\b\s*[:=]\s*["']([A-Za-z0-9_./+=:-]{24,})["']/gi],
];

function likelyCredentialValue(value) {
  if (/placeholder|example|changeme|change-me|dummy|fake|redacted|your[-_]?key|test[-_]?key/i.test(value)) return false;
  const frequencies = new Map();
  for (const character of value) frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
  const entropy = [...frequencies.values()].reduce((sum, count) => {
    const probability = count / value.length;
    return sum - probability * Math.log2(probability);
  }, 0);
  return entropy >= 3.2;
}

function secretFindings(root, files) {
  const findings = [];
  for (const file of files) {
    const full = path.join(root, file);
    let content;
    try { content = readFileSync(full, 'utf8'); } catch { continue; }
    findings.push(...findSecretMatchesInText(file, content));
  }
  return findings;
}

export function findSecretMatchesInText(file, content) {
  if (content.includes('\0')) return [];
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const [category, regex] of SECRET_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(lines[i]);
      if (match && (category !== 'generic-secret-assignment' || likelyCredentialValue(match[1]))) {
        const fixture = /(^|\/)(__tests__|tests|Tests|fixtures)\/|\.(test|spec)\./.test(file);
        findings.push({ path: file, line: i + 1, category: fixture ? `${category}:fixture-or-example-review` : category });
      }
    }
  }
  return findings;
}

export function audit(root = DEFAULT_ROOT) {
  const resources = flattenedResources(root);
  const inventory = publicationInventory(root);
  const trackedFiles = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
  const untrackedPaths = inventory.map((entry) => entry.path);
  const secretScanPaths = [...new Set([...trackedFiles, ...untrackedPaths])].filter(isTextLikePath).sort();
  return {
    auditMode: 'read-only; no files written',
    i18nextResolution: { defaultNamespace: 'common', fallbackLanguage: 'en', fallbackNamespaces: [] },
    resources: resourceAudit(resources),
    existingTestContract: {
      expectedStringLeafCount: existingKeyCountContract(root),
      actualEnglishStringLeafCount: resourceAudit(resources).keyCount.en,
      difference: existingKeyCountContract(root) === null ? null : resourceAudit(resources).keyCount.en - existingKeyCountContract(root),
    },
    references: auditReferences(root, resources),
    publicationInventory: inventory,
    publicationSummary: inventory.reduce((summary, entry) => {
      summary[entry.classification] = (summary[entry.classification] ?? 0) + 1;
      return summary;
    }, {}),
    secretScan: { scannedFileCount: secretScanPaths.length, findings: secretFindings(root, secretScanPaths) },
  };
}

export { finiteStringValues, flattenLeaves, placeholders };

function main() {
  const report = audit();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const unapprovedEmptyJapanese = report.resources.emptyValues.filter((entry) => !entry.intentionalWhitespace);
  const unclassifiedSecretCandidates = report.secretScan.findings.filter((finding) => !finding.category.endsWith(':fixture-or-example-review'));
  const fail = report.resources.keyParityDifferences.length > 0 || report.resources.namespaceDifference.onlyEn.length > 0 || report.resources.namespaceDifference.onlyJa.length > 0 || unapprovedEmptyJapanese.length > 0 || report.resources.placeholderDifferences.length > 0 || report.existingTestContract.difference !== 0 || report.references.missingLiteralReferences.length > 0 || unclassifiedSecretCandidates.length > 0;
  if (fail) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
