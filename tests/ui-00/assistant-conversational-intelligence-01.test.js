const assert = require('node:assert/strict');
const test = require('node:test');

const conversational = require('../../scripts/julvox-assistant-conversational-intelligence-01.js');

const prefs = (identity = 'neutral', tone = 'warm', address_mode = 'tu') => ({ identity, tone, address_mode });

function turn(state, message, preferences = prefs(), scanner = null) {
  conversational.updateLocalState(state, message);
  return conversational.localConversationFallback(message, preferences, state, scanner);
}

function forbidBudgetQuestion(response) {
  const lowered = response.toLowerCase();
  assert.equal(lowered.includes('quel budget'), false);
  assert.equal(lowered.includes('prix maximum'), false);
  assert.equal(lowered.includes('combien veux-tu consacrer'), false);
  assert.equal(lowered.includes('combien voulez-vous consacrer'), false);
}

test('politeness contract mirrors Bonjour and Salut', () => {
  let state = conversational.createConversationState();
  assert.match(turn(state, 'Bonjour'), /^Bonjour\b/);
  state = conversational.createConversationState();
  assert.match(turn(state, 'Salut'), /^Salut\b/);
});

test('first direct purchase need starts with Bonjour and answers before asking', () => {
  const state = conversational.createConversationState();
  const response = turn(state, 'Je cherche un casque audio pour mon fils.');
  assert.match(response, /^Bonjour\b/);
  assert.match(response, /ton fils/i);
  assert.match(response, /confort|solidité|usage/i);
  assert.ok(response.indexOf('Pour ton fils') < response.indexOf('?'));
});

test('local fallback remembers sport and 1000 euros instead of asking budget again', () => {
  const state = conversational.createConversationState();
  turn(state, 'Je cherche un casque audio pour mon fils.');
  const response = turn(state, 'Sport, 1000€.');
  assert.match(response, /ton fils/i);
  assert.match(response, /sportif/i);
  assert.match(response, /1[\s\u202f]000\s€/);
  forbidBudgetQuestion(response);
  assert.ok((response.match(/\?/g) || []).length <= 1);
});

test('anti-questionnaire does not repeat the already asked format question', () => {
  const state = conversational.createConversationState();
  turn(state, 'Je cherche un casque audio pour mon fils.');
  const second = turn(state, 'Sport, 1000€.');
  const third = turn(state, '1000€, sans compromis');
  assert.match(second, /intra-auriculaires ou un casque autour des oreilles/i);
  forbidBudgetQuestion(second);
  forbidBudgetQuestion(third);
  assert.match(third, /sans compromis/i);
  assert.equal(third.includes('?'), false);
  assert.equal(/intra-auriculaires ou un casque autour des oreilles/i.test(third), false);
});

test('full TV context is reused without budget, size or usage questionnaire', () => {
  const state = conversational.createConversationState();
  const response = turn(state, 'TV 65 pouces, budget 1500 €, films, pièce sombre.');
  assert.match(response, /65 pouces/i);
  assert.match(response, /1[\s\u202f]500\s€/);
  assert.match(response, /films/i);
  assert.match(response, /sombre/i);
  forbidBudgetQuestion(response);
  assert.equal(/quelle taille|quel usage/i.test(response), false);
  assert.equal(response.includes('?'), false);
});

test('active conversation says thanks without restarting with Bonjour', () => {
  const state = conversational.createConversationState();
  turn(state, 'Je cherche un casque pour mon fils.');
  const response = turn(state, 'Merci.');
  assert.match(response, /^Avec plaisir/);
  assert.equal(response.toLowerCase().startsWith('bonjour'), false);
});

test('vous mode and neutral identity stay consistent', () => {
  const state = conversational.createConversationState();
  const response = turn(state, 'Bonjour', prefs('neutral', 'warm', 'vous'));
  assert.match(response, /vous/i);
  const lowered = response.toLowerCase();
  for (const forbidden of ['ravi', 'ravie', 'prêt', 'prête', 'ravi(e)', 'prêt(e)', '·']) {
    assert.equal(lowered.includes(forbidden), false);
  }
});

test('feminine and masculine self references still honor tu and vous', () => {
  assert.match(conversational.selfReference(prefs('feminine', 'warm', 'tu')), /ravie de t’aider.*prête/);
  assert.match(conversational.selfReference(prefs('feminine', 'warm', 'vous')), /ravie de vous aider.*prête/);
  assert.match(conversational.selfReference(prefs('masculine', 'warm', 'tu')), /ravi de t’aider.*prêt/);
  assert.match(conversational.selfReference(prefs('masculine', 'warm', 'vous')), /ravi de vous aider.*prêt/);
});

test('unknown scanner fallback never invents a product', () => {
  const state = conversational.createConversationState();
  conversational.updateLocalState(state, '4008146364402');
  const response = conversational.localConversationFallback(
    '4008146364402', prefs(), state, { code: '4008146364402', verified: false },
  );
  assert.match(response, /^Bonjour\b/);
  assert.match(response, /Je regarde si je trouve une correspondance/i);
  assert.match(response, /pas encore trouvé de correspondance suffisamment fiable/i);
  assert.match(response, /ne pas inventer le produit/i);
});

test('verified scanner fallback puts verified product name before any question', () => {
  const state = conversational.createConversationState();
  conversational.updateLocalState(state, '4008146364402');
  const response = conversational.localConversationFallback(
    '4008146364402', prefs(), state,
    {
      code: '4008146364402',
      verified: true,
      product: { name: 'Casque Test Vérifié', brand: 'Marque Vérifiée', current_price: 199 },
    },
  );
  assert.match(response, /Casque Test Vérifié/);
  assert.match(response, /INFORMATIONS INSUFFISANTES/);
  assert.equal(response.includes('?'), false);
});

test('conversation context parser recognizes short facts without losing prior turns', () => {
  let context = conversational.extractContext('Je cherche un casque audio pour mon fils.');
  context = conversational.extractContext('Sport, 1000€.', context);
  context = conversational.extractContext('12 ans, pas Apple, surtout confortable.', context);
  assert.deepEqual(context, {
    product_category: 'casque audio',
    recipient: 'fils',
    usage: 'sport',
    budget_eur: 1000,
    recipient_age: 12,
    exclusion: 'Apple',
    priority: 'confort',
  });
});

test('runtime rotates a conversation session for an initial home prompt and posts it once', () => {
  const runtime = conversational.RUNTIME;
  assert.match(runtime, /newSession\(\);resetConversationDom\(\);window\.sendAIMessage\(initial\)/);
  assert.match(runtime, /session_id:conversationSessionId/);
  assert.equal((runtime.match(/fetch\(apiBase\+'\/ai\/chat'/g) || []).length, 1);
});

test('runtime exposes a scanner bridge using the same conversational endpoint', () => {
  const runtime = conversational.RUNTIME;
  assert.match(runtime, /sendJulvoxScannerMessage/);
  assert.match(runtime, /scanner_context:scanner/);
  assert.match(runtime, /window\.sendAIMessage\(code,\{scanner_context:scanner\}\)/);
});

test('integration is idempotent and requires Lot A ordering', () => {
  const base = '<html><body><script id="julvox-assistant-human-presence-02-runtime"></script></body></html>';
  const once = conversational.integrate(base);
  const twice = conversational.integrate(once);
  assert.equal(once, twice);
  assert.doesNotThrow(() => conversational.verify(once));
  assert.throws(() => conversational.integrate('<html><body></body></html>'), /requires Lot A runtime/);
});
