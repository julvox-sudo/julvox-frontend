const test = require('node:test');
const assert = require('node:assert/strict');
const { CRITICAL_GLOBAL_HANDLERS, verifyPublicRuntimeSyntax } = require('../../scripts/verify-public-runtime-syntax.js');

function validArtifact() {
  const handlers = CRITICAL_GLOBAL_HANDLERS.map(name => `function ${name}(){ return true; }`).join('\n');
  return `<!doctype html><html><body><button>Réessayer</button><script>${handlers}</script></body></html>`;
}

test('public runtime verification rejects a syntax error before mobile listeners can install', () => {
  assert.throws(
    () => verifyPublicRuntimeSyntax('<!doctype html><script>, timeout = 8000) {}</script><button>Réessayer</button>'),
    /inline script 1 does not parse: Unexpected token ','/,
  );
});

test('public runtime verification requires every critical mobile handler', () => {
  const broken = validArtifact().replace('function handleSearch(){ return true; }', '');
  assert.throws(() => verifyPublicRuntimeSyntax(broken), /critical mobile handler is missing: handleSearch/);
});

test('public runtime verification accepts a parseable artifact with critical handlers and retry', () => {
  assert.deepEqual(verifyPublicRuntimeSyntax(validArtifact()), {
    inlineScriptCount: 1,
    criticalHandlerCount: CRITICAL_GLOBAL_HANDLERS.length,
  });
});
