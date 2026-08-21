const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-intelligent-decision-watch-01');

test('watch scope requires explicit currency, market, and product condition', () => {
  assert.deepEqual(feature.buildWatchPayload({ currency: 'eur', marketCountry: 'fr', condition: 'new' }), {
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'new',
  });
  assert.throws(() => feature.buildWatchPayload({ currency: '', marketCountry: 'FR', condition: 'new' }), /devise/i);
  assert.throws(() => feature.buildWatchPayload({ currency: 'EUR', marketCountry: '', condition: 'new' }), /pays|marché/i);
  assert.throws(() => feature.buildWatchPayload({ currency: 'EUR', marketCountry: 'FR', condition: '' }), /état/i);
});

test('watch normalization fails closed on inferred authority or automatic recheck', () => {
  const raw = {
    id: 7,
    decisionId: 'decision-1',
    subjectId: 'catalog:product-1',
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'new',
    source: 'explicit_user',
    automaticRecheck: false,
    active: true,
    pendingChange: false,
  };
  assert.ok(feature.normalizeWatch(raw, 'decision-1'));
  assert.equal(feature.normalizeWatch({ ...raw, source: 'inferred' }, 'decision-1'), null);
  assert.equal(feature.normalizeWatch({ ...raw, automaticRecheck: true }, 'decision-1'), null);
  assert.equal(feature.normalizeWatch({ ...raw, active: false }, 'decision-1'), null);
  assert.equal(feature.normalizeWatch(raw, 'other-decision'), null);
});

test('watch list accepts only the explicit-user non-automatic backend authority', () => {
  const watch = {
    id: 9,
    decisionId: 'decision-2',
    subjectId: 'catalog:product-2',
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'used',
    source: 'explicit_user',
    automaticRecheck: false,
    active: true,
    pendingChange: true,
  };
  const normalized = feature.normalizeWatchList({ authority: 'explicit_user_watch', automaticRecheck: false, watches: [watch] });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].pendingChange, true);
  assert.equal(feature.normalizeWatchList({ authority: 'behavioral_watch', automaticRecheck: false, watches: [watch] }), null);
  assert.equal(feature.normalizeWatchList({ authority: 'explicit_user_watch', automaticRecheck: true, watches: [watch] }), null);
});

test('creation response requires canonical-observation-only semantics', () => {
  const watch = {
    id: 11,
    decisionId: 'decision-3',
    subjectId: 'catalog:product-3',
    currency: 'EUR',
    marketCountry: 'FR',
    condition: 'refurbished',
    source: 'explicit_user',
    automaticRecheck: false,
    active: true,
    pendingChange: false,
  };
  const payload = {
    watch,
    authority: 'explicit_user_watch',
    automaticRecheck: false,
    notificationSemantics: 'canonical_observation_change_only',
  };
  assert.ok(feature.normalizeCreateResponse(payload, 'decision-3'));
  assert.equal(feature.normalizeCreateResponse({ ...payload, notificationSemantics: 'price_drop' }, 'decision-3'), null);
  assert.equal(feature.normalizeCreateResponse({ ...payload, automaticRecheck: true }, 'decision-3'), null);
});

test('delete acknowledgement never implies a recheck', () => {
  assert.equal(feature.normalizeDeleteResponse({ status: 'deleted', automaticRecheck: false }), true);
  assert.equal(feature.normalizeDeleteResponse({ status: 'deleted', automaticRecheck: true }), false);
  assert.equal(feature.normalizeDeleteResponse({ status: 'ok', automaticRecheck: false }), false);
});

test('runtime uses only centralized authenticated API for watch CRUD', () => {
  for (const required of [
    'window.JULVOX_API',
    'client.get(LIST_ENDPOINT',
    "client.post('/decisions/'",
    'client.delete(LIST_ENDPOINT',
    '/decision-watches',
    '/watch',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(required), required);

  for (const forbidden of [
    'fetch(',
    'localStorage',
    'DecisionEngine',
    'Gemini',
    'Notification(',
    'setInterval(',
    '/recheck',
  ]) assert.equal(feature.RUNTIME_SCRIPT.includes(forbidden), false, forbidden);
});

test('UI wording preserves user control and never promises an automatic decision', () => {
  for (const required of [
    'Me prévenir si le contexte change',
    'Activer la surveillance',
    'Arrêter la surveillance',
    'Aucune nouvelle décision n’est calculée automatiquement',
    'Vous gardez le contrôle de toute réévaluation',
    'Réévaluez quand vous le souhaitez',
    'Aucun prix cible et aucun seuil commercial ne sont utilisés',
  ]) assert.ok(feature.RUNTIME_SCRIPT.includes(required), required);
});

test('runtime contains no deal, affiliate, target-price, or urgency authority', () => {
  for (const forbidden of [
    'affiliate_url',
    'deal_quality_score',
    'target_price',
    'send_price_alert_email',
    'Achetez maintenant',
    'promotion',
    'économisez',
    'dépêchez',
  ]) assert.equal(feature.RUNTIME_SCRIPT.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
});

test('watch state is server-derived and pending change is displayed without claiming delivery', () => {
  assert.ok(feature.RUNTIME_SCRIPT.includes('watchesByDecision'));
  assert.ok(feature.RUNTIME_SCRIPT.includes('watch.pendingChange'));
  assert.ok(feature.RUNTIME_SCRIPT.includes('Une notification peut être envoyée si un canal Julvox est disponible'));
  assert.equal(feature.RUNTIME_SCRIPT.includes('notification livrée'), false);
  assert.equal(feature.RUNTIME_SCRIPT.includes('notification reçue'), false);
});

test('integration is deterministic, idempotent, and stacked after certified P5.5 UI', () => {
  const html = '<!doctype html><html><head><script src="api-client.js"></script></head><body><script id="julvox-p5-decision-history-01-runtime"></script><script id="julvox-p5-manual-decision-recheck-01-runtime"></script></body></html>';
  const once = feature.integrate(html);
  assert.match(once, /julvox-p5-intelligent-decision-watch-01-runtime/);
  assert.match(once, /julvox-p5-intelligent-decision-watch-01-styles/);
  assert.equal(feature.integrate(once), once);
  assert.equal((once.match(/julvox-p5-intelligent-decision-watch-01-runtime/g) || []).length, 1);
});
