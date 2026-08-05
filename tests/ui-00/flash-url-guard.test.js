const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  MALFORMED_FLASH_URL_GUARD,
  SAFE_FLASH_URL_GUARD,
  repairFlashUrlGuard,
} = require('../../scripts/ui00-transforms/repair-flash-url-guard.js');

test('repairs the malformed generated flash URL guard and yields parseable code', () => {
  const source = `function openFlashPage(){ const url = 'https://example.test'; ${MALFORMED_FLASH_URL_GUARD} }`;
  const repaired = repairFlashUrlGuard(source);
  assert.doesNotMatch(repaired, /\^https\?:\/\/\//);
  assert.match(repaired, /url\.startsWith\('https:\/\/'\)/);
  assert.match(repaired, /url\.startsWith\('http:\/\/'\)/);
  assert.doesNotThrow(() => new vm.Script(repaired));
});

test('is idempotent only for the exact safe guard', () => {
  assert.equal(repairFlashUrlGuard(SAFE_FLASH_URL_GUARD), SAFE_FLASH_URL_GUARD);
  assert.throws(() => repairFlashUrlGuard('function openFlashPage(){}'), /malformed=0, safe=0/);
  assert.throws(() => repairFlashUrlGuard(`${MALFORMED_FLASH_URL_GUARD}\n${MALFORMED_FLASH_URL_GUARD}`), /malformed=2/);
});
