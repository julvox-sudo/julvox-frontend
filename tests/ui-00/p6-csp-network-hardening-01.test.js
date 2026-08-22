'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../vercel.json'), 'utf8'));
const policy = config.headers
  .flatMap(entry => entry.headers || [])
  .find(header => header.key === 'Content-Security-Policy')?.value || '';

function directive(name) {
  const part = policy.split(';').map(value => value.trim()).find(value => value.startsWith(`${name} `));
  return part ? part.split(/\s+/).slice(1) : [];
}

test('CSP uses explicit network allowlists required by the public artifact', () => {
  assert.deepEqual(directive('connect-src'), ["'self'", 'https://*.up.railway.app', 'https://accounts.google.com/gsi/']);
  assert.deepEqual(directive('img-src'), ["'self'", 'data:', 'https://images.unsplash.com', 'https://images.weserv.nl']);
  assert.ok(directive('script-src').includes('https://accounts.google.com/gsi/client'));
  assert.ok(directive('style-src').includes('https://fonts.googleapis.com'));
  assert.ok(directive('style-src').includes('https://accounts.google.com/gsi/style'));
  assert.ok(directive('font-src').includes('https://fonts.gstatic.com'));
  assert.deepEqual(directive('frame-src'), ['https://accounts.google.com/gsi/']);
});

test('CSP does not pretend inline code is removable before the frontend refactor', () => {
  assert.ok(directive('script-src').includes("'unsafe-inline'"));
  assert.ok(directive('style-src').includes("'unsafe-inline'"));
  assert.deepEqual(directive('frame-ancestors'), ["'none'"]);
  assert.deepEqual(directive('object-src'), ["'none'"]);
});
