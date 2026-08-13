'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  SOURCE_ANCHOR,
  TRACEABILITY_MARKER,
  verifyServiceWorkerBackendContract,
} = require('../../scripts/verify-service-worker-backend-contract-consumption.js');
const {
  SERVICE_WORKER_BACKEND_SOURCE_ANCHOR,
  materializeServiceWorkerBackendOrigin,
} = require('../../build-static.js');

const root = path.join(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/runtime-contract.json'), 'utf8'));

function readGeneratedBackendOrigin() {
  const runtimeSource = fs.readFileSync(path.join(root, 'runtime-config.js'), 'utf8');
  const context = { globalThis: {} };
  vm.runInNewContext(runtimeSource, context, { filename: 'runtime-config.js' });
  return new URL(context.globalThis.JULVOX_RUNTIME_CONFIG.backend.apiBaseUrl).origin;
}

const backendOrigin = readGeneratedBackendOrigin();

function failuresFor(candidateSource, candidateBuilt) {
  return verifyServiceWorkerBackendContract({
    source: candidateSource,
    built: candidateBuilt,
    backendOrigin,
  });
}

function validBuilt(candidateSource = source) {
  return materializeServiceWorkerBackendOrigin(candidateSource, backendOrigin);
}

test('service worker source uses exactly one neutral backend build anchor', () => {
  assert.equal(SERVICE_WORKER_BACKEND_SOURCE_ANCHOR, SOURCE_ANCHOR);
  assert.equal(source.split(SOURCE_ANCHOR).length - 1, 1);
  assert.doesNotMatch(source, /railway\.app|julvox-dealscan/i);
  assert.doesNotMatch(source, /\bapi_base_url\b/);
  assert.doesNotMatch(source, /const\s+BACKEND_ORIGIN\s*=\s*['"]https?:\/\//);
});

test('missing and duplicated source anchors are rejected', () => {
  const built = validBuilt();
  assert.match(failuresFor(source.replace(SOURCE_ANCHOR, ''), built).join('\n'), /exactly one neutral backend origin build anchor/);
  assert.match(failuresFor(`${source}\n${SOURCE_ANCHOR}\n`, built).join('\n'), /exactly one neutral backend origin build anchor/);
});

test('hardcoded Railway, api_base_url and hostname fragments are rejected in source', () => {
  const built = validBuilt();
  assert.match(failuresFor(source.replace(SOURCE_ANCHOR, "const BACKEND_ORIGIN = 'https://old.up.railway.app';"), built).join('\n'), /Railway|hardcode/);
  assert.match(failuresFor(`${source}\nconst api_base_url = 'https://backend.invalid';`, built).join('\n'), /snake_case/);
  assert.match(failuresFor(`${source}\n${"url.hostname.includes('railway.app') || url.hostname.includes('julvox-dealscan')"};`, built).join('\n'), /historical|Railway/);
});

test('build derives the only backend origin from the runtime contract deterministically', () => {
  const first = validBuilt();
  const second = validBuilt();
  assert.equal(first, second);
  assert.deepEqual(failuresFor(source, first), []);
  assert.equal(first.split(`const BACKEND_ORIGIN = '${backendOrigin}'; /* ${TRACEABILITY_MARKER} */`).length - 1, 1);
  assert.equal(first.split('if (url.origin === BACKEND_ORIGIN) {').length - 1, 1);
  assert.doesNotMatch(first, /__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__/);
});

test('runtime backend.apiBaseUrl and built service worker resolve to the same authority', () => {
  assert.equal(readGeneratedBackendOrigin(), backendOrigin);
  assert.deepEqual(failuresFor(source, validBuilt()), []);
});

test('built output rejects a missing marker, another origin or an implicit fallback', () => {
  const built = validBuilt();
  assert.match(failuresFor(source, built.replace(TRACEABILITY_MARKER, 'removed-marker')).join('\n'), /traceability marker/);
  assert.match(failuresFor(source, built.replace(backendOrigin, 'https://other.invalid')).join('\n'), /derived from backend\.api_base_url/);
  assert.match(failuresFor(source, built.replace("const BACKEND_ORIGIN = '", "const BACKEND_ORIGIN = FALLBACK || '")).join('\n'), /derived from backend\.api_base_url|fallback/);
});
