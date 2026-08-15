'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test('service worker backend authority comes from generated runtime config', () => {
  const buildStatic = fs.readFileSync(path.join(root, 'build-static.js'), 'utf8');
  const body = functionBody(buildStatic, 'integrateServiceWorkerRuntime');

  assert.doesNotMatch(
    body,
    /contract\.backend\.api_base_url/,
    'service worker must not use canonical production backend contract as runtime authority',
  );
  assert.match(
    body,
    /runtime-config\.js|JULVOX_RUNTIME_CONFIG|apiBaseUrl/,
    'service worker build must consume the already-generated runtime backend authority',
  );
});

test('Vercel config contains no branch-specific backend authority', () => {
  const vercel = fs.readFileSync(path.join(root, 'vercel.json'), 'utf8');

  assert.doesNotMatch(vercel, /julvox-backend-reconciliation/i);
  assert.doesNotMatch(vercel, /VERCEL_GIT_COMMIT_REF/);
  assert.doesNotMatch(vercel, /feat\/julvox-frontend-reconciliation-01/);
});
