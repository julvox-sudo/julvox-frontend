const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-explicit-decision-feedback-01');

test('feedback payload accepts only explicit helpful or not helpful state', () => {
  assert.deepEqual(feature.buildFeedbackPayload({ sentiment: 'helpful', comment: '  Très   clair. ' }), {
    sentiment: 'helpful',
    comment: 'Très clair.',
  });
  assert.deepEqual(feature.buildFeedbackPayload({ sentiment: 'not_helpful', comment: '' }), {
    sentiment: 'not_helpful',
    comment: null,
  });
  assert.throws(() => feature.buildFeedbackPayload({ sentiment: 'maybe' }), /utile/i);
  assert.throws(() => feature.buildFeedbackPayload({ sentiment: 'helpful', comment: 'x'.repeat(601) }), /600/);
});

test('feedback normalization fails closed on inferred or automatic authority', () => {
  const raw = {
    id: 3,
    decisionId: 'decision-1',
    sentiment: 'helpful',
    comment: 'Utile.',
    source: 'explicit_user',
    automaticUse: false,
  };
  assert.ok(feature.normalizeFeedback(raw, 'decision-1'));
  assert.equal(feature.normalizeFeedback({ ...raw, source: 'inferred' }, 'decision-1'), null);
  assert.equal(feature.normalizeFeedback({ ...raw, automaticUse: true }, 'decision-1'), null);
  assert.equal(feature.normalizeFeedback({ ...raw, sentiment: 'positive_score' }, 'decision-1'), null);
  assert.equal(feature.normalizeFeedback(raw, 'decision-2'), null);
});

test('feedback response requires explicit-user authority and permits honest empty state', () => {
  assert.deepEqual(feature.normalizeFeedbackResponse({ authority: 'explicit_user_feedback', automaticUse: false, feedback: null }), {
    authority: 'explicit_user_feedback',
    automaticUse: false,
    feedback: null,
  });
  assert.equal(feature.normalizeFeedbackResponse({ authority: 'behavioral_feedback', automaticUse: false, feedback: null }), null);
  assert.equal(feature.normalizeFeedbackResponse({ authority: 'explicit_user_feedback', automaticUse: true, feedback: null }), null);
});

test('delete acknowledgement never implies downstream automatic use', () => {
  assert.equal(feature.normalizeDeleteResponse({ status: 'deleted', automaticUse: false }), true);
  assert.equal(feature.normalizeDeleteResponse({ status: 'deleted', automaticUse: true }), false);
  assert.equal(feature.normalizeDeleteResponse({ status: 'ok', automaticUse: false }), false);
});

test('runtime uses only centralized authenticated API against separate feedback resource', () => {
  for (const required of [
    'window.JULVOX_API',
    'client.get(',
    'client.put(',
    'client.delete(',
    '/decision-feedback/',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(required), required);

  for (const forbidden of [
    'fetch(',
    'localStorage',
    '/decisions/{decision_id}/feedback',
    "'/decisions/'",
  ]) assert.equal(feature.RUNTIME_SCRIPT.includes(forbidden), false, forbidden);
});

test('UI wording preserves explicit consent and no automatic decision use', () => {
  for (const required of [
    'Cette décision vous a-t-elle été utile ?',
    'Oui, utile',
    'Pas vraiment',
    'Commentaire facultatif',
    'Votre retour est enregistré uniquement parce que vous choisissez de le donner.',
    'Il n’est pas appliqué automatiquement à vos décisions, préférences ou recommandations.',
    'Supprimer mon retour',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(required), required);
});

test('runtime contains no DecisionEngine, Gemini, ML, deal, affiliate, or target-price authority', () => {
  for (const forbidden of [
    'DecisionEngine',
    'Gemini',
    '/ml/',
    'score_preference',
    'favorite_categories',
    'target_price',
    'affiliate_url',
    'deal_quality_score',
    'Achetez maintenant',
    'promotion',
  ]) assert.equal(feature.RUNTIME_SCRIPT.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
});

test('user-provided feedback text is rendered through textContent helpers', () => {
  assert.ok(feature.RUNTIME_SCRIPT.includes('item.textContent=text'));
  assert.equal(feature.RUNTIME_SCRIPT.includes('innerHTML='), false);
  assert.equal(feature.RUNTIME_SCRIPT.includes('insertAdjacentHTML'), false);
});

test('integration is deterministic, idempotent, and stacked after P5.6 watch UI', () => {
  const html = '<!doctype html><html><head><script src="api-client.js"></script></head><body><script id="julvox-p5-decision-history-01-runtime"></script><script id="julvox-p5-intelligent-decision-watch-01-runtime"></script></body></html>';
  const once = feature.integrate(html);
  assert.match(once, /julvox-p5-explicit-decision-feedback-01-runtime/);
  assert.match(once, /julvox-p5-explicit-decision-feedback-01-styles/);
  assert.equal(feature.integrate(once), once);
  assert.equal((once.match(/julvox-p5-explicit-decision-feedback-01-runtime/g) || []).length, 1);
});

test('published UI contract advertises explicit feedback with no automatic use', () => {
  assert.ok(feature.RUNTIME_SCRIPT.includes("authority:'explicit_user_feedback'"));
  assert.ok(feature.RUNTIME_SCRIPT.includes('automaticUse:false'));
  assert.ok(feature.RUNTIME_SCRIPT.includes("endpointTemplate:'/decision-feedback/{decision_id}'"));
});
