const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-manual-decision-recheck-01');

test('price is optional and an absent price never becomes a current fact', () => {
  assert.deepEqual(feature.buildRecheckPayload({}), {
    currentTotalMinor: null,
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'new',
    totalPayableConfirmed: false,
  });
});

test('a confirmed payable-now amount is converted to minor units without reusing history', () => {
  assert.deepEqual(feature.buildRecheckPayload({
    amount: '1299,90',
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'new',
    totalPayableConfirmed: true,
  }), {
    currentTotalMinor: 129990,
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'new',
    totalPayableConfirmed: true,
  });
});

test('an unconfirmed price is rejected client-side instead of being strengthened', () => {
  assert.throws(() => feature.buildRecheckPayload({
    amount: '99',
    totalPayableConfirmed: false,
  }), /total réellement payable maintenant/i);
});

test('recheck response fails closed if backend manual boundaries are not preserved', () => {
  const base = {
    previousDecisionId: 'old',
    persistenceStatus: 'created',
    snapshot: { decision: { id: 'new', recommendation: 'favorable', confidence: 'medium' } },
    recheck: {
      mode: 'manual',
      observedAt: '2026-08-21T20:00:00+00:00',
      freshPriceAccepted: false,
      worldMemoryProjected: true,
      historicalFactsReused: false,
      preferenceMemoryApplied: false,
      automaticWatch: false,
      missingInformation: [],
    },
  };
  assert.ok(feature.normalizeRecheckResponse(base, 'old'));
  assert.equal(feature.normalizeRecheckResponse({ ...base, recheck: { ...base.recheck, historicalFactsReused: true } }, 'old'), null);
  assert.equal(feature.normalizeRecheckResponse({ ...base, recheck: { ...base.recheck, preferenceMemoryApplied: true } }, 'old'), null);
  assert.equal(feature.normalizeRecheckResponse({ ...base, recheck: { ...base.recheck, automaticWatch: true } }, 'old'), null);
  assert.equal(feature.normalizeRecheckResponse(base, 'other'), null);
});

test('INSUFFICIENT_DATA remains an explicit new-decision outcome', () => {
  const normalized = feature.normalizeRecheckResponse({
    previousDecisionId: 'old',
    persistenceStatus: 'created',
    snapshot: { decision: { id: 'new', recommendation: 'insufficient_data', confidence: 'none' } },
    recheck: {
      mode: 'manual',
      observedAt: '2026-08-21T20:00:00+00:00',
      freshPriceAccepted: false,
      worldMemoryProjected: false,
      historicalFactsReused: false,
      preferenceMemoryApplied: false,
      automaticWatch: false,
      missingInformation: ['Disponibilité vérifiée maintenant'],
    },
  }, 'old');
  assert.ok(normalized);
  assert.equal(feature.recommendationLabel(normalized.recommendation), 'INFORMATIONS INSUFFISANTES');
  assert.deepEqual([...normalized.missingInformation], ['Disponibilité vérifiée maintenant']);
});

test('runtime uses the centralized API only and creates no parallel authority, memory use, or watch', () => {
  for (const required of [
    "client.post('/decisions/'",
    '/recheck',
    'window.JULVOX_API',
    "mode:'manual'",
    'preferenceMemoryApplied:false',
    'automaticWatch:false',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(required), required);

  for (const forbidden of [
    'fetch(',
    'DecisionEngine',
    'Gemini',
    'localStorage',
    'setInterval(',
    'Notification(',
    '/account/decision-preferences',
    'preferenceMemoryApplied:true',
    'automaticWatch:true',
  ]) assert.equal(feature.RUNTIME_SCRIPT.includes(forbidden), false, forbidden);
});

test('UI distinguishes historical and new snapshots and explains the action is voluntary', () => {
  for (const text of [
    'Réévaluer maintenant',
    'ANCIENNE DÉCISION',
    'NOUVELLE DÉCISION',
    'Vous demandez une nouvelle évaluation',
    'L’ancienne décision restera enregistrée et inchangée',
    'total réellement payable maintenant',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(text), text);
});

test('UI never pre-fills an old price and only reports backend-provided missing information', () => {
  assert.equal(feature.RUNTIME_SCRIPT.includes('currentTotalMinor='), false);
  assert.equal(feature.RUNTIME_SCRIPT.includes('pricePosition'), false);
  assert.ok(feature.RUNTIME_SCRIPT.includes('normalized.missingInformation'));
  assert.ok(feature.RUNTIME_SCRIPT.includes('amount.value'));
  assert.ok(feature.RUNTIME_SCRIPT.includes("amount.placeholder='Ex. 1299,00'"));
});

test('integration is deterministic, idempotent, and stacked after frozen P5.4B', () => {
  const html = '<!doctype html><html><head><script src="api-client.js"></script></head><body><script id="julvox-p5-decision-history-01-runtime"></script><script id="julvox-p5-decision-timeline-01-runtime"></script><script id="julvox-p5-explicit-preferences-ui-01-runtime"></script></body></html>';
  const once = feature.integrate(html);
  assert.match(once, /julvox-p5-manual-decision-recheck-01-runtime/);
  assert.match(once, /julvox-p5-manual-decision-recheck-01-styles/);
  assert.equal(feature.integrate(once), once);
  assert.equal((once.match(/julvox-p5-manual-decision-recheck-01-runtime/g) || []).length, 1);
});
