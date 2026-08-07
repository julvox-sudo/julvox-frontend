const test = require('node:test');
const assert = require('node:assert/strict');
const hardening = require('../../scripts/product-barcode-scanner-01-hardening.js');

function scannerFixture() {
  return '<!doctype html><html><head></head><body><script id="julvox-product-barcode-scanner-01-runtime">document.documentElement.setAttribute(\'data-prscan-open\',\'true\');document.documentElement.removeAttribute(\'data-prscan-open\');</script></body></html>';
}

test('validates EAN-13, UPC-A and EAN-8 check digits', () => {
  assert.equal(hardening.isValidManualBarcode('4006381333931'), true);
  assert.equal(hardening.isValidManualBarcode('036000291452'), true);
  assert.equal(hardening.isValidManualBarcode('96385074'), true);
  assert.equal(hardening.isValidManualBarcode('4006381333932'), false);
  assert.equal(hardening.isValidManualBarcode('036000291453'), false);
  assert.equal(hardening.isValidManualBarcode('96385075'), false);
});

test('validates full UPC-E through deterministic UPC-A expansion', () => {
  assert.equal(hardening.expandUpce('04252614'), '042100005264');
  assert.equal(hardening.isValidManualBarcode('04252614'), true);
  assert.equal(hardening.isValidManualBarcode('04252615'), false);
});

test('rejects partial and unsupported manual barcode lengths', () => {
  assert.equal(hardening.isValidManualBarcode('123456'), false);
  assert.equal(hardening.isValidManualBarcode('1234567'), false);
  assert.equal(hardening.isValidManualBarcode('123456789'), false);
  assert.equal(hardening.isValidManualBarcode(''), false);
});

test('hardening runtime intercepts invalid manual input before scanner lookup', () => {
  const html = hardening.applyScannerHardening(scannerFixture());
  assert.match(html, /Code invalide\. Vérifie tous les chiffres, y compris le chiffre de contrôle\./);
  assert.match(html, /event\.stopImmediatePropagation\(\)/);
  assert.match(html, /aria-invalid/);
  assert.match(html, /data-prscan-active/);
  assert.doesNotThrow(() => hardening.verifyScannerHardening(html));
});

test('Android/browser Back closes the scanner through a dedicated history entry', () => {
  const html = hardening.applyScannerHardening(scannerFixture());
  assert.match(html, /history\.pushState\(next, '', location\.href\)/);
  assert.match(html, /history\.back\(\)/);
  assert.match(html, /window\.addEventListener\('popstate'/);
  assert.match(html, /data-prscan-action="close"/);
});
