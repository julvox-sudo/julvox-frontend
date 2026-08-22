const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('P6 removes the non-durable one-hour notification snooze promise', () => {
  assert.doesNotMatch(serviceWorker, /action:\s*['"]snooze['"]/u);
  assert.doesNotMatch(serviceWorker, /Rappel\s*\+1h/u);
  assert.doesNotMatch(serviceWorker, /event\.action\s*===\s*['"]snooze['"]/u);
  assert.doesNotMatch(serviceWorker, /3_600_000/u);
});

test('price alerts keep only truthful immediate notification actions', () => {
  assert.match(serviceWorker, /type === 'alert_price'[\s\S]*action: 'view'[\s\S]*action: 'dismiss'/u);
});
