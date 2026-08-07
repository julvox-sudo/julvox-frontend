const test = require('node:test');
const assert = require('node:assert/strict');
const { HOME_RUNTIME } = require('../../scripts/product-realign-01b-home.js');

test('mappe les trois actions du menu secondaire vers des destinations Julvox explicites', () => {
  assert.match(HOME_RUNTIME, /help: Object\.freeze\(\{ hash: '#aide', pageId: 'pr01bHelpPage' \}\)/);
  assert.match(HOME_RUNTIME, /settings: Object\.freeze\(\{ hash: '#parametres', pageId: 'pr01bSettingsPage' \}\)/);
  assert.match(HOME_RUNTIME, /assistant: Object\.freeze\(\{ hash: '#assistant', pageId: null \}\)/);
  assert.match(HOME_RUNTIME, /if \(action === 'help'\) \{ openSecondaryPage\(SECONDARY_ROUTES\.help\.pageId, SECONDARY_ROUTES\.help\.hash, trigger\); return; \}/);
  assert.match(HOME_RUNTIME, /if \(action === 'settings'\) \{ openSecondaryPage\(SECONDARY_ROUTES\.settings\.pageId, SECONDARY_ROUTES\.settings\.hash, trigger\); return; \}/);
  assert.match(HOME_RUNTIME, /if \(action === 'assistant'\) \{ openAssistant\(trigger\); return; \}/);
});

test('ne réutilise aucune destination historique DealScan pour Aide ou Paramètres', () => {
  assert.doesNotMatch(HOME_RUNTIME, /\bopenAccountPage\b|\baccountPage\b|\bguidePage\b|\bDealScan\b|\bNovaDeal\b/);
  assert.match(HOME_RUNTIME, /'Aide \/ Informations'/);
  assert.match(HOME_RUNTIME, /'Paramètres utilisateur'/);
});

test('conserve Assistant comme seule action secondaire ouvrant l Assistant IA', () => {
  assert.match(HOME_RUNTIME, /function openAssistant\(trigger\)[\s\S]*?typeof window\.openAIChat === 'function'\) window\.openAIChat\(\)/);
  assert.match(HOME_RUNTIME, /dataset\.homeAction = 'assistant'/);
  assert.match(HOME_RUNTIME, /Assistant IA/);
});

test('rétablit les libellés du menu flottant sur Android', () => {
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-nav-label\{position:static!important;width:auto!important;height:auto!important;overflow:visible!important;clip:auto!important;white-space:normal!important\}/);
  assert.match(HOME_RUNTIME, /label\.textContent = 'Informations'/);
});
