const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('P6 service worker uses Julvox cache identity only', () => {
  assert.match(serviceWorker, /DEPLOY_MARKER_JULVOX_SW_V17_OFFLINE_SHELL_01/u);
  assert.match(serviceWorker, /julvox-public-api-/u);
  assert.match(serviceWorker, /julvox-static-/u);
  assert.doesNotMatch(serviceWorker, /DEPLOY_MARKER_DEALSCAN/u);
  assert.doesNotMatch(serviceWorker, /dealscan-public-api-/u);
  assert.doesNotMatch(serviceWorker, /dealscan-static-/u);
});
