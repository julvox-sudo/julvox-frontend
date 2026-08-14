const test = require('node:test');
const assert = require('node:assert/strict');
const smartScan = require('../../scripts/product-smart-scan-01.js');
const hardening = require('../../scripts/product-smart-scan-01-hardening.js');

function baseHtml() {
  const source = '<!doctype html><html><head></head><body><main>Julvox</main></body></html>';
  return smartScan.applySmartScanExperience(source);
}

function builtHtml() {
  const base = baseHtml();
  smartScan.verifySmartScanExperience(base);
  const hardened = hardening.hardenSmartScanExperience(base);
  hardening.verifySmartScanHardening(hardened);
  return hardened;
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
  assert.ok(html.includes('C’est bien ce produit'));
  assert.ok(html.includes('Ce n’est pas le bon produit'));
});

test('analysis authority comes from the server confirmation proof, not the client boolean', () => {
  const html = builtHtml();
  hardening.verifySmartScanHardening(html);
  assert.ok(html.includes("var confirmationProof = '';"));
  assert.ok(html.includes('confirmation&&confirmation.confirmationProof'));
  assert.ok(html.includes('confirmation&&confirmation.confirmedProduct'));
  assert.ok(html.includes("!confirmedProduct || !currentIdentification || !confirmationProof"));
  assert.ok(html.includes('confirmationProof:confirmationProof'));
  assert.ok(html.includes("confirmationProof=''"));
  assert.doesNotMatch(html, /confirmationProof\s*=\s*(?:crypto|Math\.random|Date\.now)/);
});

test('a new product hypothesis invalidates any previous confirmation proof', () => {
  const html = builtHtml();
  assert.ok(html.includes("currentMode=mode; currentIdentification=null; confirmedProduct=null; confirmationProof='';"));
  assert.ok(html.includes("currentIdentification=response; confirmedProduct=null; confirmationProof='';"));
  assert.ok(html.includes("currentIdentification=null; confirmedProduct=null; confirmationProof='';"));
});

test('manual barcode accepts GTIN-14 and delegates checksum validation to backend', () => {
  const html = builtHtml();
  assert.ok(html.includes('^\\d{14}$'));
  assert.ok(html.includes('EAN-8, UPC-A, EAN-13 ou GTIN-14 valide'));
  assert.ok(html.includes('placeholder="EAN-13, GTIN-14, EAN-8 ou UPC-A"'));
});

test('product confirmation card exposes source, barcode and optional sourced image', () => {
  const html = builtHtml();
  assert.ok(html.includes('Code-barres :'));
  assert.ok(html.includes('Source :'));
  assert.ok(html.includes("c&&c.imageUrl"));
  assert.ok(html.includes("confiance : '+confidenceText"));
});

test('public decision vocabulary is limited to the four Smart Scan outcomes', () => {
  const html = builtHtml();
  for (const label of ['Acheter maintenant', 'Attendre', 'Comparer davantage', 'Ne pas acheter']) {
    assert.ok(html.includes(label));
  }
  assert.ok(html.includes("['buy_now','wait','compare_more','do_not_buy']"));
});

test('Smart Scan does not embed fabricated confidence percentages', () => {
  const base = baseHtml();
  smartScan.verifySmartScanExperience(base);
  const html = builtHtml();
  hardening.verifySmartScanHardening(html);
  assert.doesNotMatch(html, /Confiance\s*:\s*(91|95|99)\s*%/i);
  assert.ok(html.includes("Number.isFinite(confidence)?Math.round(confidence*100)+' %':'non chiffrée'"));
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

test('photo bytes are never auto-persisted by an offline identify or analyze attempt', () => {
  const html = builtHtml();
  hardening.verifySmartScanHardening(html);
  assert.doesNotMatch(html, /saveDraft\(true\);/);
  assert.ok((html.match(/saveDraft\(true,false\)/g) || []).length >= 2);
  assert.ok(html.includes("includePhoto!==false&&currentMode==='photo'&&photoFile"));
  assert.ok(html.includes("if(photoDraftId){await deletePhotoDraft(photoDraftId);photoDraftId='';}"));
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
