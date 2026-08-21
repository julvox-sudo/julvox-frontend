const assert = require('node:assert/strict');
const test = require('node:test');

const metrics = require('../../scripts/julvox-p5-ethical-return-loop-metrics-01');

const BASE_HTML = `<!doctype html><html><head><script src="api-client.js"></script></head><body>
<script>function openAccountPage(){}</script>
<script id="julvox-p5-personalized-comparison-alternatives-01-runtime"></script>
<div id="accountBody"><div class="account-section"></div></div>
</body></html>`;

function validPayload(overrides = {}) {
  return {
    metrics: {
      decisionSnapshots: 4,
      explicitPreferences: 2,
      explicitFeedback: { total: 3, helpful: 2, notHelpful: 1, withComment: 1 },
      decisionWatches: { total: 2, active: 1, pendingChange: 1 },
    },
    returnLoop: {
      authority: 'descriptive_explicit_user_facts_only',
      interpretation: 'descriptive_counts_only',
      automaticFeedbackUse: false,
      automaticPreferenceUse: false,
      automaticRecheck: false,
      feedbackLearning: false,
      decisionEngineInfluence: false,
      geminiInfluence: false,
      opaqueScore: false,
      commercialRanking: false,
    },
    privacy: {
      scope: 'authenticated_user_only',
      newBehavioralTelemetry: false,
      newPersistence: false,
      commentsExposed: false,
    },
    ...overrides,
  };
}

test('normalization accepts descriptive owner-scoped counts only', () => {
  const normalized = metrics.normalizeMetricsPayload(validPayload());
  assert.ok(normalized);
  assert.equal(normalized.metrics.decisionSnapshots, 4);
  assert.equal(normalized.metrics.explicitFeedback.helpful, 2);
  assert.equal(normalized.metrics.decisionWatches.pendingChange, 1);
  assert.equal(normalized.returnLoop.feedbackLearning, false);
  assert.equal(normalized.privacy.newBehavioralTelemetry, false);
});

test('normalization fails closed when any authority becomes automatic', () => {
  for (const key of [
    'automaticFeedbackUse',
    'automaticPreferenceUse',
    'automaticRecheck',
    'feedbackLearning',
    'decisionEngineInfluence',
    'geminiInfluence',
    'opaqueScore',
    'commercialRanking',
  ]) {
    const payload = validPayload();
    payload.returnLoop[key] = true;
    assert.equal(metrics.normalizeMetricsPayload(payload), null, key);
  }
});

test('normalization fails closed when privacy guarantees weaken', () => {
  for (const key of ['newBehavioralTelemetry', 'newPersistence', 'commentsExposed']) {
    const payload = validPayload();
    payload.privacy[key] = true;
    assert.equal(metrics.normalizeMetricsPayload(payload), null, key);
  }
  const wrongScope = validPayload();
  wrongScope.privacy.scope = 'cross_user';
  assert.equal(metrics.normalizeMetricsPayload(wrongScope), null);
});

test('normalization rejects negative, fractional and inconsistent counts', () => {
  const negative = validPayload();
  negative.metrics.explicitPreferences = -1;
  assert.equal(metrics.normalizeMetricsPayload(negative), null);
  const fractional = validPayload();
  fractional.metrics.decisionSnapshots = 1.5;
  assert.equal(metrics.normalizeMetricsPayload(fractional), null);
  const feedbackOverflow = validPayload();
  feedbackOverflow.metrics.explicitFeedback.helpful = 4;
  assert.equal(metrics.normalizeMetricsPayload(feedbackOverflow), null);
  const pendingOverflow = validPayload();
  pendingOverflow.metrics.decisionWatches.pendingChange = 2;
  assert.equal(metrics.normalizeMetricsPayload(pendingOverflow), null);
});

test('runtime uses centralized authenticated GET only', () => {
  const runtime = metrics.RUNTIME_SCRIPT;
  assert.ok(runtime.includes("client.get(ENDPOINT,{token:bearer})"));
  assert.ok(runtime.includes('window.JULVOX_API'));
  assert.ok(runtime.includes('/account/p5-metrics'));
  for (const forbidden of ['fetch(', 'localStorage', '.post(', '.put(', '.delete(', 'setInterval(', 'navigator.sendBeacon']) {
    assert.equal(runtime.includes(forbidden), false, forbidden);
  }
});

test('runtime contains no competing decision, ML, commercial or opaque scoring authority', () => {
  const runtime = metrics.RUNTIME_SCRIPT;
  for (const forbidden of ['DecisionEngine', 'Gemini', '/ml/', 'affiliate_url', 'deal_quality_score', 'target_price', 'conversionRate', 'helpfulnessRate', 'successRate']) {
    assert.equal(runtime.includes(forbidden), false, forbidden);
  }
  assert.ok(runtime.includes('descriptive_explicit_user_facts_only'));
  assert.ok(runtime.includes('descriptive_counts_only'));
  assert.ok(runtime.includes('ni une note de performance, ni un score d’achat'));
});

test('user-facing copy makes the ethical return loop explicit', () => {
  const runtime = metrics.RUNTIME_SCRIPT;
  assert.ok(runtime.includes('Votre feedback ne réentraîne pas Julvox automatiquement.'));
  assert.ok(runtime.includes('ne sont pas appliquées silencieusement à vos décisions.'));
  assert.ok(runtime.includes('Aucune réévaluation de décision n’est déclenchée par ce bilan.'));
  assert.ok(runtime.includes('ne crée aucun suivi comportemental supplémentaire.'));
  assert.ok(runtime.includes('Aucun commentaire de feedback n’est affiché ici.'));
});

test('integration is deterministic, idempotent and stacked after P5.8', () => {
  const once = metrics.integrate(BASE_HTML);
  const twice = metrics.integrate(once);
  assert.equal(once, twice);
  assert.equal((once.match(/julvox-p5-ethical-return-loop-metrics-01-runtime/g) || []).length, 1);
  assert.equal((once.match(/julvox-p5-ethical-return-loop-metrics-01-styles/g) || []).length, 1);
  assert.ok(once.indexOf('julvox-p5-personalized-comparison-alternatives-01-runtime') < once.indexOf('julvox-p5-ethical-return-loop-metrics-01-runtime'));
  assert.equal(metrics.verify(once), once);
});

test('integration refuses to bypass the frozen P5.8 prerequisite', () => {
  const withoutP58 = BASE_HTML.replace('<script id="julvox-p5-personalized-comparison-alternatives-01-runtime"></script>', '');
  assert.throws(() => metrics.integrate(withoutP58), /P5\.8 comparison prerequisite is missing/);
});
