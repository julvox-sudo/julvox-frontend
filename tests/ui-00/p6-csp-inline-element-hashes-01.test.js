'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const hardener = require('../../scripts/harden-inline-element-csp.js');
const packageJson = require('../../package.json');

function digest(text) {
  return `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
}

function directive(policy, name) {
  return policy.split(';').map(value => value.trim()).find(value => value.startsWith(`${name} `)) || '';
}

test('P6.27 hardens script and style elements with exact hashes while isolating legacy attributes', () => {
  const script = 'window.example = 1;';
  const style = '.example { display: block; }';
  const html = `<!doctype html><html><head><title>x</title><style>${style}</style></head><body onclick="legacy()"><script>${script}</script></body></html>`;

  const hardened = hardener.hardenHtml(html);
  hardener.assertHardened(hardened);

  const meta = hardened.match(/data-julvox-csp="inline-elements-v1" content="([^"]+)"/);
  assert.ok(meta);
  const policy = meta[1];

  const scriptElem = directive(policy, 'script-src-elem');
  const scriptAttr = directive(policy, 'script-src-attr');
  const styleElem = directive(policy, 'style-src-elem');
  const styleAttr = directive(policy, 'style-src-attr');

  assert.ok(scriptElem.includes(digest(script)));
  assert.ok(styleElem.includes(digest(style)));
  assert.ok(!scriptElem.includes("'unsafe-inline'"));
  assert.ok(!styleElem.includes("'unsafe-inline'"));
  assert.equal(scriptAttr, "script-src-attr 'unsafe-inline'");
  assert.equal(styleAttr, "style-src-attr 'unsafe-inline'");
});

test('P6.27 ignores external scripts and preserves required GIS hosts', () => {
  const html = '<html><head><style>body{margin:0}</style></head><body><script src="/app.js"></script><script>boot()</script></body></html>';
  const policy = hardener.buildInlineElementPolicy(html);

  assert.ok(directive(policy, 'script-src-elem').includes('https://accounts.google.com/gsi/client'));
  assert.ok(directive(policy, 'style-src-elem').includes('https://fonts.googleapis.com'));
  assert.ok(directive(policy, 'style-src-elem').includes('https://accounts.google.com/gsi/style'));
  assert.equal(hardener.inlineScriptHashes(html).length, 1);
});

test('P6.27 hardening is deterministic and idempotent', () => {
  const html = '<html><head><style>.x{color:red}</style></head><body><script>window.x=1</script></body></html>';
  const once = hardener.hardenHtml(html);
  const twice = hardener.hardenHtml(once);

  assert.equal(twice, once);
  assert.equal((twice.match(/data-julvox-csp="inline-elements-v1"/g) || []).length, 1);
});

test('P6.27 build step runs only after every runtime integrator', () => {
  assert.equal(packageJson.scripts['harden:csp-inline-elements'], 'node scripts/harden-inline-element-csp.js');
  const build = packageJson.scripts.build;
  const hardenAt = build.indexOf('npm run harden:csp-inline-elements');

  assert.ok(hardenAt > build.indexOf('npm run integrate:frontend-version'));
  assert.ok(hardenAt < build.indexOf('npm run verify:config-consumption'));
});

test('P6.27 does not weaken the existing Vercel network/header policy', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '../../vercel.json'), 'utf8'));
  const csp = vercel.headers.flatMap(entry => entry.headers || []).find(header => header.key === 'Content-Security-Policy')?.value || '';

  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("connect-src 'self' https://*.up.railway.app https://accounts.google.com/gsi/"));
});
