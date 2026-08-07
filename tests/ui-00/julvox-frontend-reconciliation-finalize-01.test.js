const test = require('node:test');
const assert = require('node:assert/strict');
const { integrate } = require('../../scripts/julvox-frontend-reconciliation-01');
const { LEGACY_TERMS, finalize } = require('../../scripts/julvox-frontend-reconciliation-01-finalize');

function fixture() {
  return '<!doctype html><html><head></head><body>' +
    '<div id="julvoxDecisionHome"><div id="pr01bConversationList"></div></div>' +
    '<script id="julvox-assistant-conversational-intelligence-01-runtime"></script>' +
    '<script id="julvox-assistant-scanner-conversation-bridge-01-runtime">' +
    "if(typeof window.startNewJulvoxAssistantConversation==='function') window.startNewJulvoxAssistantConversation();\n" +
    "if(typeof window.openAIChat==='function') window.openAIChat();" +
    '</script>' +
    '<script id="julvox-product-barcode-scanner-01-runtime"></script>' +
    '<script id="julvox-product-smart-scan-01-runtime"></script>' +
    '</body></html>';
}

test('final artifact contains no forbidden legacy public vocabulary', () => {
  const html = finalize(integrate(fixture()));
  for (const term of LEGACY_TERMS) assert.equal(html.includes(term), false, term);
});

test('barcode scanner and Smart Scan both use the configured Preview backend', () => {
  const html = finalize(integrate(fixture()));
  assert.match(html, /JulvoxProductScanBackend/);
  assert.match(html, /JulvoxSmartScanBackend/);
  assert.match(html, /JULVOX_RUNTIME_CONFIG/);
  assert.match(html, /\/smart-scan\/identify/);
  assert.match(html, /\/smart-scan\/analyze/);
  assert.match(html, /credentials:'omit'/);
});

test('Smart Scan exposes product facts and the insufficient-information verdict', () => {
  const html = finalize(integrate(fixture()));
  for (const label of ['Produit identifié', 'Marque :', 'Modèle :', 'Prix disponible :', 'Source :', 'Fraîcheur :', 'INFORMATIONS INSUFFISANTES']) {
    assert.ok(html.includes(label), label);
  }
});

test('asking Julvox from the barcode scanner forwards structured verified context in the active conversation', () => {
  const html = finalize(integrate(fixture()));
  assert.match(html, /product-scanner:current:v1/);
  assert.match(html, /ensureJulvoxAssistantConversation/);
  assert.match(html, /sendJulvoxScannerMessage/);
  assert.match(html, /verified:scan\.identificationStatus==='IDENTIFIE'/);
});
