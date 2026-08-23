'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { hardenPublicArtifact: hardenDynamicDealHtml } = require('./harden-dynamic-deal-html');
const { hardenPublicArtifact: hardenDynamicPromoHtml } = require('./harden-dynamic-promo-html');
const { hardenPublicArtifact: hardenDynamicCompareHtml } = require('./harden-dynamic-compare-html');
const { hardenPublicArtifact: hardenUserIdentityDom } = require('./harden-user-identity-dom');
const { hardenPublicArtifact: hardenAccountHtml } = require('./harden-account-html');

const MARKER = 'data-julvox-csp="inline-elements-v1"';
const META_PATTERN = /<meta\s+http-equiv=["']Content-Security-Policy["']\s+data-julvox-csp=["']inline-elements-v1["'][^>]*>/i;

function sha256Source(text) {
  return `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function inlineScriptHashes(html) {
  const hashes = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = match[1] || '';
    if (/\bsrc\s*=/i.test(attributes)) continue;
    hashes.push(sha256Source(match[2] || ''));
  }
  return uniqueSorted(hashes);
}

function inlineStyleHashes(html) {
  const hashes = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    hashes.push(sha256Source(match[1] || ''));
  }
  return uniqueSorted(hashes);
}

function buildInlineElementPolicy(html) {
  const scripts = inlineScriptHashes(html);
  const styles = inlineStyleHashes(html);

  if (scripts.length === 0) {
    throw new Error('P6.27 CSP hardening expected at least one inline script element');
  }
  if (styles.length === 0) {
    throw new Error('P6.27 CSP hardening expected at least one inline style element');
  }

  const scriptHosts = ["'self'", 'https://accounts.google.com/gsi/client'];
  const styleHosts = [
    "'self'",
    'https://fonts.googleapis.com',
    'https://accounts.google.com/gsi/style',
  ];

  return [
    `script-src ${scriptHosts.join(' ')} 'unsafe-inline'`,
    `script-src-elem ${[...scriptHosts, ...scripts].join(' ')}`,
    "script-src-attr 'unsafe-inline'",
    `style-src ${styleHosts.join(' ')} 'unsafe-inline'`,
    `style-src-elem ${[...styleHosts, ...styles].join(' ')}`,
    "style-src-attr 'unsafe-inline'",
  ].join('; ');
}

function hardenHtml(html) {
  const withoutPrevious = html.replace(META_PATTERN, '');
  const headPattern = /<head(\s[^>]*)?>/i;
  if (!headPattern.test(withoutPrevious)) {
    throw new Error('P6.27 CSP hardening could not find <head> in public index');
  }

  const canonical = withoutPrevious.replace(/(<head(?:\s[^>]*)?>)\s*/i, '$1');
  const policy = buildInlineElementPolicy(canonical);
  const meta = `<meta http-equiv="Content-Security-Policy" ${MARKER} content="${policy}">`;

  return canonical.replace(headPattern, match => `${match}\n  ${meta}\n  `);
}

function assertHardened(html) {
  const markerMatches = html.match(/data-julvox-csp=["']inline-elements-v1["']/gi) || [];
  if (markerMatches.length !== 1) {
    throw new Error(`P6.27 CSP marker count must be 1, got ${markerMatches.length}`);
  }

  const metaMatch = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+data-julvox-csp=["']inline-elements-v1["']\s+content="([^"]+)">/i);
  if (!metaMatch) throw new Error('P6.27 CSP meta policy is missing or malformed');

  const policy = metaMatch[1];
  const expectedScriptHashes = inlineScriptHashes(html);
  const expectedStyleHashes = inlineStyleHashes(html);

  for (const hash of expectedScriptHashes) {
    if (!policy.includes(hash)) throw new Error(`Missing inline script CSP hash ${hash}`);
  }
  for (const hash of expectedStyleHashes) {
    if (!policy.includes(hash)) throw new Error(`Missing inline style CSP hash ${hash}`);
  }

  const scriptElem = policy.split(';').map(part => part.trim()).find(part => part.startsWith('script-src-elem ')) || '';
  const styleElem = policy.split(';').map(part => part.trim()).find(part => part.startsWith('style-src-elem ')) || '';
  if (scriptElem.includes("'unsafe-inline'")) throw new Error('script-src-elem must not allow unsafe-inline');
  if (styleElem.includes("'unsafe-inline'")) throw new Error('style-src-elem must not allow unsafe-inline');
}

function main() {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  hardenDynamicDealHtml();
  hardenDynamicPromoHtml();
  hardenDynamicCompareHtml();
  hardenUserIdentityDom();
  hardenAccountHtml();
  const source = fs.readFileSync(indexPath, 'utf8');
  const hardened = hardenHtml(source);
  assertHardened(hardened);
  fs.writeFileSync(indexPath, hardened, 'utf8');

  const scriptCount = inlineScriptHashes(hardened).length;
  const styleCount = inlineStyleHashes(hardened).length;
  console.log(`P6_27_CSP_INLINE_ELEMENT_HASHES_PASS scripts=${scriptCount} styles=${styleCount}`);
}

if (require.main === module) main();

module.exports = {
  MARKER,
  assertHardened,
  buildInlineElementPolicy,
  hardenHtml,
  inlineScriptHashes,
  inlineStyleHashes,
  sha256Source,
};
