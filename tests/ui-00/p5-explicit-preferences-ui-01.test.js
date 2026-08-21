const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-explicit-preferences-ui-01');

function preference(overrides = {}) {
  return {
    id: 7,
    topic: 'brand_preference',
    value: 'Je préfère Sony pour les téléviseurs',
    scope: 'global',
    category: null,
    source: 'explicit_user',
    automaticUse: false,
    createdAt: '2026-08-21T18:00:00+00:00',
    updatedAt: '2026-08-21T18:00:00+00:00',
    ...overrides,
  };
}

test('accepts only the explicit-user authority returned by P5.4A', () => {
  const normalized = feature.normalizeListPayload({
    authority: 'explicit_user_only',
    automaticUse: false,
    preferences: [preference()],
  });
  assert.ok(normalized);
  assert.equal(normalized.authority, 'explicit_user_only');
  assert.equal(normalized.automaticUse, false);
  assert.equal(normalized.preferences[0].source, 'explicit_user');
});

test('fails closed when the backend claims automatic use or another authority', () => {
  assert.equal(feature.normalizeListPayload({ authority: 'explicit_user_only', automaticUse: true, preferences: [] }), null);
  assert.equal(feature.normalizeListPayload({ authority: 'behavioral_profile', automaticUse: false, preferences: [] }), null);
  assert.equal(feature.normalizeListPayload({ authority: 'explicit_user_only', automaticUse: false, preferences: [preference({ source: 'inferred' })] }), null);
});

test('normalizes a global explicit write without inventing category context', () => {
  assert.deepEqual(feature.buildWritePayload({
    topic: 'brand_preference',
    value: '  Sony   de préférence  ',
    scope: 'global',
    category: 'doit être ignorée',
  }), {
    topic: 'brand_preference',
    value: 'Sony de préférence',
    scope: 'global',
    category: null,
  });
});

test('category-scoped write requires an explicit category', () => {
  assert.throws(() => feature.buildWritePayload({
    topic: 'feature_priority',
    value: 'HDMI 2.1',
    scope: 'category',
    category: '',
  }), /catégorie/i);
  assert.deepEqual(feature.buildWritePayload({
    topic: 'feature_priority',
    value: 'HDMI 2.1',
    scope: 'category',
    category: ' Téléviseurs ',
  }), {
    topic: 'feature_priority',
    value: 'HDMI 2.1',
    scope: 'category',
    category: 'Téléviseurs',
  });
});

test('rejects malformed technical topics instead of silently rewriting them', () => {
  assert.throws(() => feature.buildWritePayload({ topic: 'Marque préférée', value: 'Sony', scope: 'global' }), /thème/i);
  assert.throws(() => feature.buildWritePayload({ topic: '4k', value: 'Oui', scope: 'global' }), /thème/i);
});

test('known topics keep human-readable labels while storage keys remain deterministic', () => {
  assert.equal(feature.topicLabel('brand_preference'), 'Marque préférée');
  assert.equal(feature.topicLabel('excluded_brand'), 'Marque à éviter');
  assert.equal(feature.topicLabel('future_topic'), 'future topic');
});

test('runtime uses only the canonical API CRUD surface and no parallel memory authority', () => {
  for (const required of [
    feature.ENDPOINT,
    'window.JULVOX_API',
    '.get(',
    '.post(',
    '.put(',
    '.delete(',
    'explicit_user_only',
    'automaticUse:false',
  ]) assert.match(feature.RUNTIME_SCRIPT, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  for (const forbidden of [
    'localStorage',
    'DecisionEngine',
    'Gemini',
    'score_preference',
    'favorite_categories',
    '/ml/',
    'fetch(',
    'innerHTML',
  ]) assert.equal(feature.RUNTIME_SCRIPT.includes(forbidden), false, forbidden);
});

test('UI states that memory is explicit, revocable, and not automatically applied to decisions', () => {
  assert.match(feature.RUNTIME_SCRIPT, /Seules les préférences que vous choisissez d’enregistrer ici sont conservées/);
  assert.match(feature.RUNTIME_SCRIPT, /ne sont pas utilisées automatiquement dans vos décisions/);
  assert.match(feature.RUNTIME_SCRIPT, /Supprimer cette préférence mémorisée/);
  assert.match(feature.RUNTIME_SCRIPT, /Mémorisée à votre demande/);
});

test('integration is deterministic, idempotent, and stacked after the P5.3 resume authority', () => {
  const html = '<!doctype html><html><head><script src="api-client.js"></script></head><body><script>async function openAccountPage(){}</script><script id="julvox-p5-conversation-resume-01-runtime"></script></body></html>';
  const once = feature.integrate(html);
  assert.match(once, /julvox-p5-explicit-preferences-ui-01-runtime/);
  assert.match(once, /julvox-p5-explicit-preferences-ui-01-styles/);
  assert.equal(feature.integrate(once), once);
  assert.equal((once.match(/julvox-p5-explicit-preferences-ui-01-runtime/g) || []).length, 1);
});
