const test = require('node:test');
const assert = require('node:assert/strict');
const { integrate, verify } = require('../../scripts/julvox-frontend-reconciliation-01');

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

test('reconciliation restores the same conversation id and persisted history', () => {
  const html = integrate(fixture());
  verify(html);
  assert.match(html, /resumeJulvoxAssistantConversation/);
  assert.match(html, /data-conversation-id/);
  assert.match(html, /session_id:record\.id/);
  assert.match(html, /history:Array\.isArray/);
  assert.match(html, /context:x\.context/);
});

test('scanner reuses the active Julvox conversation instead of forcing a new one', () => {
  const html = integrate(fixture());
  assert.match(html, /ensureJulvoxAssistantConversation/);
  assert.doesNotMatch(html, /startNewJulvoxAssistantConversation\(\);\nif\(typeof window\.openAIChat/);
});

test('sufficient context stops the questionnaire and never fabricates model references', () => {
  const html = integrate(fixture());
  assert.match(html, /J’ai suffisamment d’informations pour chercher des modèles adaptés/);
  assert.match(html, /Je préfère ne pas inventer de références/);
  assert.match(html, /askedFields\.indexOf\('format'\)<0/);
});

test('Android bottom navigation accounts for safe area in portrait and landscape', () => {
  const html = integrate(fixture());
  assert.match(html, /calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /calc\(56px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /100dvh/);
});

test('forbidden legacy assistant vocabulary is rejected before rendering', () => {
  const html = integrate(fixture());
  for (const token of ['DealScan', 'NovaDeal', 'Top deals', 'bonnes affaires', "meilleures périodes d'achat", 'prix vraiment bon']) {
    assert.ok(html.includes(token), 'guard must explicitly match ' + token);
  }
  assert.match(html, /FORBIDDEN\.test\(answer\)/);
});
