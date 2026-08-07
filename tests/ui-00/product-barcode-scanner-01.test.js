const test = require('node:test');
const assert = require('node:assert/strict');
const scanner = require('../../scripts/product-barcode-scanner-01.js');

function documentFixture() {
  return '<!doctype html><html><head><title>Julvox</title></head><body><div id="julvoxDecisionHome"><div class="pr01b-examples"></div></div></body></html>';
}

test('scanner integration is deterministic and idempotent', () => {
  const first = scanner.applyScannerExperience(documentFixture());
  const second = scanner.applyScannerExperience(first);
  assert.equal(second, first);
  assert.equal((first.match(/<!-- julvox-product-barcode-scanner-01 -->/g) || []).length, 1);
  assert.doesNotThrow(() => scanner.verifyScannerExperience(first));
});

test('scanner prioritizes EAN and UPC without adding a third-party runtime dependency', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /\['ean_13','ean_8','upc_a','upc_e'\]/);
  assert.match(html, /BarcodeDetector\.getSupportedFormats/);
  assert.match(html, /navigator\.mediaDevices\.getUserMedia/);
  assert.doesNotMatch(html, /ZXing|Quagga|Dynamsoft|Scandit/i);
});

test('camera is stopped on detection, close, backgrounding and page hide', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /stream\.getTracks\(\)\.forEach/);
  assert.match(html, /track\.stop\(\)/);
  assert.match(html, /visibilitychange/);
  assert.match(html, /pagehide/);
  assert.match(html, /stopCamera\(\);\s*var dialog/);
});

test('manual barcode input remains available when camera or detector is unavailable', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /saisir le code manuellement/i);
  assert.match(html, /digits\.length === 13/);
  assert.match(html, /digits\.length === 12/);
  assert.match(html, /digits\.length === 8/);
  assert.match(html, /upc_e_candidate/);
});

test('offline scan is saved locally and never invents a decision', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /julvox:product-scanner:pending:v1/);
  assert.match(html, /Produit enregistré\. Connexion nécessaire/);
  assert.match(html, /insufficient_data/);
  assert.match(html, /INFORMATIONS INSUFFISANTES/);
  assert.doesNotMatch(html, /current_price\s*\*\s*1\.2/);
});

test('store shelf price is distinct from the barcode identity', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /Le code-barres identifie le produit\. Le prix affiché en rayon se renseigne séparément/);
  assert.match(html, /source:'user_store_shelf'/);
  assert.match(html, /Prix magasin enregistré séparément du code-barres/);
});

test('scan history is opt-in while offline pending storage remains operational', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /julvox:history:enabled/);
  assert.match(html, /localStorage\.getItem\(HISTORY_ENABLED_KEY\) === 'true'/);
  assert.match(html, /PENDING_KEY/);
});

test('assistant receives scan context without forcing product re-entry', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /Demander à Julvox/);
  assert.match(html, /Contexte scanner Julvox/);
  assert.match(html, /window\.sendAIMessage/);
  assert.match(html, /Ne fabrique aucun prix, historique, disponibilité ou économie/);
});

test('accessibility contract includes visual status, touch targets and keyboard escape', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /role','dialog'/);
  assert.match(html, /aria-modal','true'/);
  assert.match(html, /min-height:48px/);
  assert.match(html, /event\.key === 'Escape'/);
  assert.match(html, /prefers-reduced-motion/);
});

test('backend response keeps explicit ambiguity and whitelisted decisions only', () => {
  const html = scanner.applyScannerExperience(documentFixture());
  assert.match(html, /PLUSIEURS_CORRESPONDANCES/);
  assert.match(html, /IDENTIFICATION_PROBABLE/);
  assert.match(html, /\['buy_now','wait','compare','insufficient_data'\]/);
  assert.match(html, /window\.JulvoxProductScanBackend/);
});
