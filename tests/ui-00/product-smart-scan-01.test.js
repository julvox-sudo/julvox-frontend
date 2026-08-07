const test = require('node:test');
const assert = require('node:assert/strict');
const smartScan = require('../../scripts/product-smart-scan-01.js');
const hardening = require('../../scripts/product-smart-scan-01-hardening.js');

function builtHtml() {
  const source = '<!doctype html><html><head></head><body><main>Julvox</main></body></html>';
  return hardening.hardenSmartScanExperience(smartScan.applySmartScanExperience(source));
}

test('Smart Scan exposes the four authorized input modes in one dialog', () => {
  const html = builtHtml();
  assert.match(html, /id="julvoxSmartScan"[^>]+role="dialog"[^>]+aria-modal="true"/);
  for (const mode of ['barcode', 'photo', 'link', 'text']) {
    assert.ok(html.includes(`data-mode="${mode}"`), `missing ${mode} mode`);
  }
  assert.equal((html.match(/id="julvoxSmartScan"/g) || []).length, 1);
});

test('all online paths converge on identify, confirmation and analysis endpoints', () => {
  const html = builtHtml();
  assert.ok(html.includes("apiPost('/smart-scan/identify'"));
  assert.ok(html.includes("apiPost('/smart-scan/confirm'"));
  assert.ok(html.includes("apiPost('/smart-scan/analyze'"));
  assert.ok(html.includes('confirmed:true'));
  assert.ok(html.includes('Confirme d’abord le produit identifié.'));
  assert.ok(html.includes('Quel produit regardes-tu ?'));
  assert.ok(html.includes('C’est ce produit'));
});

test('public decision vocabulary is limited to the four Smart Scan outcomes', () => {
  const html = builtHtml();
  for (const label of ['Acheter maintenant', 'Attendre', 'Comparer davantage', 'Ne pas acheter']) {
    assert.ok(html.includes(label));
  }
  assert.ok(html.includes("['buy_now','wait','compare_more','do_not_buy']"));
});

test('Smart Scan does not embed fabricated confidence percentages', () => {
  const html = builtHtml();
  smartScan.verifySmartScanExperience(html);
  assert.doesNotMatch(html, /Confiance\s*:\s*(91|95|99)\s*%/i);
  assert.ok(html.includes("Number.isFinite(confidence)?' — confiance fournie : '"));
});

test('photo handling is explicit, bounded and not stored in permanent Julvox history', () => {
  const html = builtHtml();
  assert.ok(html.includes('accept="image/jpeg,image/png,image/webp"'));
  assert.ok(html.includes('capture="environment"'));
  assert.ok(html.includes('6*1024*1024'));
  assert.ok(html.includes("PHOTO_DB = 'julvox-smart-scan-private-v1'"));
  assert.ok(html.includes('PHOTO_TTL_MS = 24 * 60 * 60 * 1000'));
  assert.ok(html.includes('URL.revokeObjectURL'));
  assert.ok(html.includes("localStorage.getItem(HISTORY_ENABLED_KEY)!=='true'"));
  const historyRow = html.slice(html.indexOf('function saveHistory'), html.indexOf('async function restoreDraft'));
  assert.doesNotMatch(historyRow, /photoFile|photoDataUrl|blob|base64/i);
});

test('offline flow can save a local draft and states that online analysis is required', () => {
  const html = builtHtml();
  assert.ok(html.includes("navigator.onLine !== false"));
  assert.ok(html.includes('Produit enregistré. Connexion nécessaire pour récupérer les prix et l’analyse complète.'));
  assert.ok(html.includes('data-jvss-action="save-draft"'));
  assert.ok(html.includes('savePhotoDraft'));
  assert.ok(html.includes('readPhotoDraft'));
});

test('accessibility keeps manual entry, keyboard tabs, focus trap, status and orientation layouts', () => {
  const html = builtHtml();
  assert.ok(html.includes('inputmode="numeric"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('role="tablist"'));
  assert.ok(html.includes("event.key==='ArrowRight'||event.key==='ArrowLeft'"));
  assert.ok(html.includes("event.key==='Tab'"));
  assert.ok(html.includes('@media (orientation:landscape)'));
  assert.ok(html.includes('@media (max-width:760px)'));
  assert.ok(html.includes('Aucun son n’est requis.'));
});

test('A2.2 brand assets are not replaced by Smart Scan integration', () => {
  const html = builtHtml();
  assert.doesNotMatch(smartScan.SMART_SCAN_HTML, /brand\/|julvox-logo-horizontal|glyph-master/);
  assert.ok(html.includes('Julvox · aide à la décision'));
});

test('photo hardening captures the File before clearing the input', () => {
  const html = builtHtml();
  hardening.verifySmartScanHardening(html);
  const start = html.indexOf('function photoChanged(event)');
  const end = html.indexOf('function keydown', start);
  const functionText = html.slice(start, end);
  assert.ok(functionText.indexOf('var file=event.target.files') < functionText.indexOf('resetPhotoMemory()'));
});

test('Smart Scan integration is idempotent', () => {
  const once = builtHtml();
  const twice = smartScan.applySmartScanExperience(once);
  assert.equal(once, twice);
});
