const assert = require('node:assert/strict');
const test = require('node:test');

const comparison = require('../../scripts/julvox-p5-personalized-comparison-alternatives-01');

const BASE_HTML = `<!doctype html><html><head><script src="api-client.js"></script></head><body>
<script id="julvox-p5-decision-history-01-runtime"></script>
<script id="julvox-p5-explicit-preferences-ui-01-runtime"></script>
<script id="julvox-p5-explicit-decision-feedback-01-runtime"></script>
<div id="julvoxDecisionHome"><div id="julvoxP5DecisionHistoryBody"></div></div>
</body></html>`;

function validAlternative(overrides = {}) {
  return {
    candidateId: 'catalog:2',
    productId: 2,
    name: 'Alternative factuelle',
    brand: 'Gamma',
    category: 'Soundbar',
    imageUrl: null,
    preferenceMatches: [],
    evaluationStatus: 'not_evaluated',
    recommendation: null,
    confidence: null,
    decisionAuthority: 'requires_separate_current_factual_evaluation',
    missingInformation: ['Prix total réellement payable maintenant'],
    ...overrides,
  };
}

function validResponse(overrides = {}) {
  return {
    decisionId: 'decision-1',
    subjectId: 'catalog:1',
    status: 'alternatives_found',
    alternatives: [validAlternative()],
    personalization: {
      mode: 'explicit_request_only',
      automaticPreferenceUse: false,
      feedbackLearning: false,
      selectedPreferenceIds: [],
      appliedPreferences: [],
    },
    comparisonAuthority: {
      currentDecision: 'existing_immutable_decision_snapshot',
      alternativeIdentity: 'catalog_only',
      alternativeDecision: 'not_evaluated',
      opaqueScore: false,
      commercialOrdering: false,
    },
    explanation: 'À évaluer séparément.',
    ...overrides,
  };
}

test('build payload keeps personalization explicitly user-selected', () => {
  const payload = comparison.buildAlternativePayload({
    decisionId: ' decision-1 ',
    preferredBrands: 'Sony, Samsung, sony',
    excludedBrands: 'Brand X',
    preferenceIds: [4, 9],
    limit: 4,
  });
  assert.deepEqual(payload, {
    decisionId: 'decision-1',
    limit: 4,
    preferredBrands: ['Sony', 'Samsung'],
    excludedBrands: ['Brand X'],
    preferenceIds: [4, 9],
  });
});

test('payload rejects hidden or malformed authority inputs', () => {
  assert.throws(() => comparison.buildAlternativePayload({ decisionId: '', limit: 4 }), /Décision invalide/);
  assert.throws(() => comparison.buildAlternativePayload({ decisionId: 'd', limit: 7 }), /compris entre 1 et 6/);
  assert.throws(() => comparison.buildAlternativePayload({ decisionId: 'd', preferenceIds: [1, 1] }), /Sélection/);
  assert.throws(() => comparison.buildAlternativePayload({ decisionId: 'd', preferenceIds: [0] }), /Sélection/);
});

test('frozen P5.4B brand topics and legacy aliases are the only selectable topics', () => {
  assert.deepEqual(Object.keys(comparison.SUPPORTED_PREFERENCE_TOPICS).sort(), [
    'avoid_brand',
    'brand_preference',
    'excluded_brand',
    'preferred_brand',
  ]);
  const common = { id: 1, value: 'Gamma', scope: 'global', category: null, source: 'explicit_user', automaticUse: false };
  assert.ok(comparison.normalizePreference({ ...common, topic: 'brand_preference' }));
  assert.ok(comparison.normalizePreference({ ...common, topic: 'excluded_brand' }));
  assert.equal(comparison.normalizePreference({ ...common, topic: 'budget_preference' }), null);
});

test('preference list fails closed on authority but ignores unrelated valid topics', () => {
  const normalized = comparison.normalizePreferenceList({
    authority: 'explicit_user_only',
    automaticUse: false,
    preferences: [
      { id: 1, topic: 'brand_preference', value: 'Gamma', scope: 'global', category: null, source: 'explicit_user', automaticUse: false },
      { id: 2, topic: 'usage_priority', value: 'cinéma', scope: 'global', category: null, source: 'explicit_user', automaticUse: false },
    ],
  });
  assert.equal(normalized.preferences.length, 1);
  assert.equal(normalized.preferences[0].topic, 'brand_preference');
  assert.equal(comparison.normalizePreferenceList({ authority: 'other', automaticUse: false, preferences: [] }), null);
  assert.equal(comparison.normalizePreferenceList({ authority: 'explicit_user_only', automaticUse: true, preferences: [] }), null);
});

test('alternative normalization requires not-evaluated state with no verdict', () => {
  assert.ok(comparison.normalizeAlternative(validAlternative()));
  assert.equal(comparison.normalizeAlternative(validAlternative({ evaluationStatus: 'evaluated' })), null);
  assert.equal(comparison.normalizeAlternative(validAlternative({ recommendation: 'BUY' })), null);
  assert.equal(comparison.normalizeAlternative(validAlternative({ confidence: 'HIGH' })), null);
  assert.equal(comparison.normalizeAlternative(validAlternative({ decisionAuthority: 'catalog_match_is_enough' })), null);
});

test('response normalization requires explicit non-commercial authority', () => {
  const normalized = comparison.normalizeAlternativeResponse(validResponse(), 'decision-1');
  assert.ok(normalized);
  assert.equal(normalized.alternatives[0].recommendation, null);
  assert.equal(comparison.normalizeAlternativeResponse(validResponse({ decisionId: 'other' }), 'decision-1'), null);
  assert.equal(comparison.normalizeAlternativeResponse(validResponse({ personalization: { ...validResponse().personalization, automaticPreferenceUse: true } }), 'decision-1'), null);
  assert.equal(comparison.normalizeAlternativeResponse(validResponse({ comparisonAuthority: { ...validResponse().comparisonAuthority, opaqueScore: true } }), 'decision-1'), null);
  assert.equal(comparison.normalizeAlternativeResponse(validResponse({ comparisonAuthority: { ...validResponse().comparisonAuthority, commercialOrdering: true } }), 'decision-1'), null);
});

test('honest insufficient-data statuses accept only an empty alternative list', () => {
  const base = validResponse({
    status: 'insufficient_catalog_identity',
    alternatives: [],
    comparisonAuthority: undefined,
  });
  assert.ok(comparison.normalizeAlternativeResponse(base, 'decision-1'));
  assert.equal(comparison.normalizeAlternativeResponse({ ...base, alternatives: [validAlternative()] }, 'decision-1'), null);
});

test('runtime loads saved preferences only after explicit click', () => {
  const runtime = comparison.RUNTIME_SCRIPT;
  const click = runtime.indexOf("prefButton.addEventListener('click'");
  const get = runtime.indexOf('client.get(PREFERENCES_ENDPOINT');
  assert.ok(click >= 0);
  assert.ok(get > click);
  assert.ok(runtime.includes('Choisir des préférences mémorisées'));
  assert.ok(runtime.includes('Julvox n’utilise aucune préférence mémorisée sans que vous la sélectionniez'));
});

test('runtime contains no parallel decision, scoring, commercial or storage authority', () => {
  const runtime = comparison.RUNTIME_SCRIPT;
  for (const forbidden of ['fetch(', 'localStorage', 'DecisionEngine', 'Gemini', '/ml/', 'deal_quality_score', 'affiliate_url', 'target_price', 'bestAlternative', 'matchScore']) {
    assert.equal(runtime.includes(forbidden), false, forbidden);
  }
  assert.ok(runtime.includes("client.post(ENDPOINT"));
  assert.ok(runtime.includes('not_evaluated'));
  assert.ok(runtime.includes('pas encore des recommandations'));
});

test('integration is deterministic and stacked after P5.7 feedback', () => {
  const once = comparison.integrate(BASE_HTML);
  const twice = comparison.integrate(once);
  assert.equal(once, twice);
  assert.equal((once.match(/julvox-p5-personalized-comparison-alternatives-01-runtime/g) || []).length, 1);
  assert.equal((once.match(/julvox-p5-personalized-comparison-alternatives-01-styles/g) || []).length, 1);
  assert.ok(once.indexOf('julvox-p5-explicit-decision-feedback-01-runtime') < once.indexOf('julvox-p5-personalized-comparison-alternatives-01-runtime'));
  assert.equal(comparison.verify(once), once);
});
