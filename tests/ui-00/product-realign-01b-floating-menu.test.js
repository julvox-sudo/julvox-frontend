const test = require('node:test');
const assert = require('node:assert/strict');
const { HOME_RUNTIME } = require('../../scripts/product-realign-01b-home.js');

test('mappe les quatre actions du menu secondaire vers des destinations Julvox explicites', () => {
  assert.match(HOME_RUNTIME, /help: Object\.freeze\(\{ hash: '#aide', pageId: 'pr01bHelpPage' \}\)/);
  assert.match(HOME_RUNTIME, /settings: Object\.freeze\(\{ hash: '#parametres', pageId: 'pr01bSettingsPage' \}\)/);
  assert.match(HOME_RUNTIME, /assistant: Object\.freeze\(\{ hash: '#assistant', pageId: null \}\)/);
  assert.match(HOME_RUNTIME, /accessibility: Object\.freeze\(\{ hash: '#accessibilite', pageId: 'pr01bAccessibilityPage' \}\)/);
  assert.match(HOME_RUNTIME, /if \(action === 'help'\) \{ openSecondaryPage\(SECONDARY_ROUTES\.help\.pageId, SECONDARY_ROUTES\.help\.hash, trigger\); return; \}/);
  assert.match(HOME_RUNTIME, /if \(action === 'settings'\) \{ openSecondaryPage\(SECONDARY_ROUTES\.settings\.pageId, SECONDARY_ROUTES\.settings\.hash, trigger\); return; \}/);
  assert.match(HOME_RUNTIME, /if \(action === 'assistant'\) \{ openAssistant\(trigger\); return; \}/);
  assert.match(HOME_RUNTIME, /if \(action === 'accessibility'\) \{ openSecondaryPage\(SECONDARY_ROUTES\.accessibility\.pageId, SECONDARY_ROUTES\.accessibility\.hash, trigger\); return; \}/);
});

test('ne réutilise aucune destination historique DealScan pour Aide ou Paramètres', () => {
  assert.doesNotMatch(HOME_RUNTIME, /\bopenAccountPage\b|\baccountPage\b|\bguidePage\b|\bDealScan\b|\bNovaDeal\b/);
  assert.match(HOME_RUNTIME, /'Aide \/ Informations'/);
  assert.match(HOME_RUNTIME, /'Paramètres utilisateur'/);
});

test('conserve Assistant comme seule action secondaire ouvrant l Assistant IA', () => {
  assert.match(HOME_RUNTIME, /function openAssistant\(trigger\)[\s\S]*?typeof window\.openAIChat === 'function'\) window\.openAIChat\(\)/);
  assert.match(HOME_RUNTIME, /appendSecondaryButton\(container, 'assistant', 'Assistant IA', assistantButtonMarkup\(\)\)/);
  assert.match(HOME_RUNTIME, /Assistant IA/);
});

test('crée une destination Accessibilité sans prétendre activer les fonctions futures', () => {
  assert.match(HOME_RUNTIME, /appendSecondaryButton\(container, 'accessibility', 'Accessibilité', accessibilityButtonMarkup\(\)\)/);
  assert.match(HOME_RUNTIME, /'Accessibilité'/);
  assert.match(HOME_RUNTIME, /function accessibilityButtonMarkup\(\)[\s\S]*?<svg viewBox="0 0 24 24"/);
  for (const label of ['Texte agrandi', 'Contraste renforcé', 'Mode daltonien', 'Police dyslexie', 'Lecture vocale', 'Réduction des animations', 'Boutons agrandis', 'TalkBack']) {
    assert.match(HOME_RUNTIME, new RegExp(label));
  }
  assert.match(HOME_RUNTIME, /À venir/);
});

test('donne à chaque ligne mobile une vraie zone tactile compacte et alignée', () => {
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-nav-btn\{width:100%!important;height:56px;min-height:56px;/);
  assert.match(HOME_RUNTIME, /justify-content:flex-start!important;align-items:center!important;padding:0 16px!important;gap:14px!important/);
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-nav-icon\{position:static;flex:0 0 24px;width:24px;height:24px\}/);
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-nav-label\{position:static!important;width:auto!important;height:auto!important;overflow:hidden!important;clip:auto!important;white-space:nowrap!important;flex:1 1 auto;min-width:0;text-overflow:ellipsis;text-align:left;font-size:15px;line-height:1\.2\}/);
});

test('compacte le panneau et fournit un retour visuel au toucher', () => {
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-mobile-sheet-card\{width:min\(320px,calc\(100vw - 28px\)\);padding:8px;display:grid;gap:4px;align-content:start;background:#fffdf9;border-radius:20px;box-shadow:var\(--pr01b-shadow\)\}/);
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet \.pr01b-nav-btn:active\{background:rgba\(14,167,161,\.16\);transform:scale\(\.985\)\}/);
  assert.match(HOME_RUNTIME, /touch-action:manipulation/);
});

test('conserve le menu mobile sur les téléphones Android en paysage', () => {
  assert.match(HOME_RUNTIME, /@media \(orientation:landscape\) and \(max-height:500px\) and \(max-width:960px\)/);
  assert.match(HOME_RUNTIME, /#julvoxDecisionHome \.pr01b-mobilebar\{display:flex/);
  assert.match(HOME_RUNTIME, /#julvoxDecisionHome \.pr01b-mobile-menu\{border:1px solid var\(--pr01b-line\);background:#fff;border-radius:12px/);
  assert.match(HOME_RUNTIME, /#julvoxDecisionHome \.pr01b-mobile-nav\{display:grid/);
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet\{position:fixed;z-index:60;inset:0;/);
  assert.match(HOME_RUNTIME, /#pr01bMobileSheet\[data-open="true"\]\{display:flex\}/);
});

test('reste compatible avec le zoom texte sans sortir les libellés de leur ligne', () => {
  assert.match(HOME_RUNTIME, /white-space:nowrap!important/);
  assert.match(HOME_RUNTIME, /text-overflow:ellipsis/);
  assert.match(HOME_RUNTIME, /overflow:hidden!important/);
});
