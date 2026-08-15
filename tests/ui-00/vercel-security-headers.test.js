const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../vercel.json'), 'utf8'),
);

function header(name) {
  const rules = Array.isArray(config.headers) ? config.headers : [];
  for (const rule of rules) {
    const found = (rule.headers || []).find(item => item.key === name);
    if (found) return found.value;
  }
  return null;
}

test('CSP defines an explicit script boundary and never permits unsafe-eval', () => {
  const csp = header('Content-Security-Policy');
  assert.equal(typeof csp, 'string');
  assert.match(csp, /(?:^|;\s*)default-src 'self'(?:;|$)/);
  assert.match(csp, /(?:^|;\s*)script-src 'self' 'unsafe-inline'(?:;|$)/);
  assert.equal(csp.includes("'unsafe-eval'"), false);
  assert.match(csp, /(?:^|;\s*)object-src 'none'(?:;|$)/);
  assert.match(csp, /(?:^|;\s*)frame-ancestors 'none'(?:;|$)/);
  assert.match(csp, /(?:^|;\s*)base-uri 'self'(?:;|$)/);
  assert.match(csp, /(?:^|;\s*)form-action 'self'(?:;|$)/);
});

test('inline allowance is documented by architecture rather than widened to eval or arbitrary script origins', () => {
  const csp = header('Content-Security-Policy');
  const scriptDirective = csp.split(';').map(part => part.trim()).find(part => part.startsWith('script-src '));
  assert.equal(scriptDirective, "script-src 'self' 'unsafe-inline'");
});