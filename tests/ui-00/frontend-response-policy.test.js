'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

function responseHeaders() {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(vercel.buildCommand, 'npm run build');
  return Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]));
}

function cspDirective(policy, name) {
  return policy.split(';').map(value => value.trim()).find(value => value.startsWith(name + ' ')) || '';
}

test('frontend response policy keeps explicit browser security boundaries', () => {
  const headers = responseHeaders();
  const csp = headers['Content-Security-Policy'];

  assert.ok(csp.includes("default-src 'self'"));
  assert.equal(cspDirective(csp, 'script-src'), "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client");
  assert.equal(cspDirective(csp, 'style-src'), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style");
  assert.equal(cspDirective(csp, 'img-src'), "img-src 'self' data: https://images.unsplash.com https://images.weserv.nl");
  assert.equal(cspDirective(csp, 'font-src'), "font-src 'self' data: https://fonts.gstatic.com");
  assert.equal(cspDirective(csp, 'connect-src'), "connect-src 'self' https://*.up.railway.app https://accounts.google.com/gsi/");
  assert.equal(cspDirective(csp, 'frame-src'), 'frame-src https://accounts.google.com/gsi/');
  assert.equal(cspDirective(csp, 'frame-ancestors'), "frame-ancestors 'none'");
  assert.equal(cspDirective(csp, 'object-src'), "object-src 'none'");
  assert.equal(cspDirective(csp, 'base-uri'), "base-uri 'self'");
  assert.equal(cspDirective(csp, 'form-action'), "form-action 'self'");

  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headers['Strict-Transport-Security'].includes('max-age=63072000'));
});

test('frontend CSP keeps frame authority limited to Google Identity Services', () => {
  const csp = responseHeaders()['Content-Security-Policy'];
  assert.equal(cspDirective(csp, 'frame-src'), 'frame-src https://accounts.google.com/gsi/');
  assert.equal(cspDirective(csp, 'frame-ancestors'), "frame-ancestors 'none'");
});
