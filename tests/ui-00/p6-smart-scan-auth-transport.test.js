'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const {
  MARKER,
  PRODUCT_RUNTIME_ID,
  ADAPTER_RUNTIME_ID,
  LEGACY_PRODUCT_API,
  SAFE_PRODUCT_API,
  LEGACY_CONFIRM,
  SAFE_CONFIRM,
  LEGACY_ANALYZE,
  SAFE_ANALYZE,
  LEGACY_ADAPTER,
  SAFE_ADAPTER,
  hardenHtml,
} = require('../../scripts/reconcile-smart-scan-auth-transport');

const fixture = [
  '<html><body>',
  `<script id="${PRODUCT_RUNTIME_ID}">`,
  LEGACY_PRODUCT_API,
  "async function identify(){return apiPost('/smart-scan/identify',{});}",
  LEGACY_CONFIRM,
  LEGACY_ANALYZE,
  '</script>',
  `<script id="${ADAPTER_RUNTIME_ID}">`,
  LEGACY_ADAPTER,
  '</script>',
  '<!-- P6_85_CONVERSATION_AUTH_TRANSPORT -->',
  '</body></html>',
].join('\n');

function runtime(html, id) {
  const startTag = `<script id="${id}">`;
  const start = html.indexOf(startTag);
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start);
  return html.slice(start + startTag.length, end);
}

test('P6.86 authenticates only protected Smart Scan confirm and analyze routes', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const product = runtime(hardened, PRODUCT_RUNTIME_ID);
  const adapter = runtime(hardened, ADAPTER_RUNTIME_ID);
  assert.equal(product.includes(MARKER), true);
  assert.equal(product.includes("path==='/smart-scan/confirm'||path==='/smart-scan/analyze'"), true);
  assert.equal(adapter.includes("route==='/smart-scan/confirm'||route==='/smart-scan/analyze'"), true);
  assert.equal(product.includes("path==='/smart-scan/identify'"), false);
  assert.equal(adapter.includes("route==='/smart-scan/identify'"), false);
  assert.equal(hardened.includes("apiPost('/smart-scan/identify'"), true);
});

test('P6.86 removes direct Smart Scan fetches from both active transport boundaries', () => {
  const hardened = hardenHtml(fixture);
  const product = runtime(hardened, PRODUCT_RUNTIME_ID);
  const adapter = runtime(hardened, ADAPTER_RUNTIME_ID);
  assert.equal(product.includes('fetch(base+path'), false);
  assert.equal(adapter.includes('fetch(base+route'), false);
  assert.equal(product.includes('client.fetchResponse(base+path,options)'), true);
  assert.equal(adapter.includes('client.fetchResponse(base+route,options)'), true);
  assert.equal((product.match(/options\.token=accessToken/g) || []).length, 1);
  assert.equal((adapter.match(/options\.token=accessToken/g) || []).length, 1);
});

test('P6.86 preserves omit credentials and uses the existing currentUser token only when protected', () => {
  const hardened = hardenHtml(fixture);
  const product = runtime(hardened, PRODUCT_RUNTIME_ID);
  const adapter = runtime(hardened, ADAPTER_RUNTIME_ID);
  assert.equal(product.includes("typeof currentUser!=='undefined'"), true);
  assert.equal(adapter.includes("typeof currentUser!=='undefined'"), true);
  assert.equal(product.includes("credentials:'omit'"), true);
  assert.equal(adapter.includes("credentials:'omit'"), true);
  assert.equal(product.includes('if(smartScanFallbackProtected(path))'), true);
  assert.equal(adapter.includes('if(smartScanTransportProtected(route))'), true);
});

test('P6.86 classifies 401/403 as authentication state in both Smart Scan transports', () => {
  const hardened = hardenHtml(fixture);
  const product = runtime(hardened, PRODUCT_RUNTIME_ID);
  const adapter = runtime(hardened, ADAPTER_RUNTIME_ID);
  assert.equal(product.includes("error.code='AUTH_REQUIRED'"), true);
  assert.equal(adapter.includes("error.code='AUTH_REQUIRED'"), true);
  assert.equal(product.includes('response.status===401||response.status===403'), true);
  assert.equal(adapter.includes('response.status===401||response.status===403'), true);
});

test('P6.86 gives explicit login guidance for protected confirmation and analysis', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('Connecte-toi pour confirmer ce produit avant l’analyse.'), true);
  assert.equal(hardened.includes('Connecte-toi pour demander l’analyse Julvox.'), true);
  assert.equal(hardened.includes("window.openAuth('login')"), true);
  assert.equal(hardened.includes("apiPost('/smart-scan/confirm'"), true);
  assert.equal(hardened.includes("apiPost('/smart-scan/analyze'"), true);
});

test('P6.86 safe Smart Scan runtime fragments remain syntactically valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script([SAFE_PRODUCT_API, SAFE_CONFIRM, SAFE_ANALYZE].join('\n')));
  assert.doesNotThrow(() => new vm.Script(SAFE_ADAPTER));
});

test('P6.86 is chained after P6.85 and before CSP hashing', () => {
  const p684 = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'reconcile-wishlist-detail-open-runtime.js'), 'utf8');
  assert.equal(p684.includes("require('./reconcile-conversation-auth-transport')"), true);
  assert.equal(p684.includes("require('./reconcile-smart-scan-auth-transport')"), true);
  const p685Call = p684.indexOf('reconcileConversationAuthTransport(target);');
  const p686Call = p684.indexOf('reconcileSmartScanAuthTransport(target);');
  assert.ok(p685Call >= 0 && p686Call > p685Call);

  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p684Call = csp.indexOf('reconcileWishlistDetailOpenRuntime();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p684Call >= 0 && readCall > p684Call);
});
