'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

function responseHeaders() {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(vercel.buildCommand, 'npm run build', 'Vercel build must not inject branch-specific backend authority');
  assert.ok(Array.isArray(vercel.headers) && vercel.headers.length > 0, 'response headers must be configured');
  return Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]));
}

test('frontend response policy keeps explicit browser security boundaries', () => {
  const headers = responseHeaders();
  const csp = headers['Content-Security-Policy'];

  assert.ok(csp, 'Content-Security-Policy must be present');
  for (const directive of [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]) {
    assert.match(csp, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `CSP must contain ${directive}`);
  }

  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(headers['Strict-Transport-Security'], /max-age=63072000/);
});

test('frontend CSP does not silently widen script or frame authority', () => {
  const csp = responseHeaders()['Content-Security-Policy'];

  assert.doesNotMatch(csp, /script-src[^;]*\*/);
  assert.doesNotMatch(csp, /frame-src[^;]*https:/);
  assert.doesNotMatch(csp, /frame-ancestors[^;]*https:/);
});
