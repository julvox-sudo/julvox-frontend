const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-structured-explainability-01');

const fixture = '<!doctype html><html><head></head><body><div id="julvoxDecisionHome"></div><script id="julvox-p5-decision-history-01-runtime"></script><script id="julvox-p5-decision-timeline-01-runtime"></script></body></html>';

function decision(overrides = {}) {
  return {
    recommendation: 'wait',
    reasons: [],
    ruleResults: [],
    ...overrides,
  };
}

function rule({ applicable = true, score = 0, reason = 'Raison persistée.', evidence = [] } = {}) {
  return { applicable, score, confidence: 'medium', reason, evidence };
}

test('classifies positive and negative applied rules without exposing a new decision', () => {
  const result = feature.classifyDecisionExplanation(decision({
    ruleResults: [
      rule({ score: 70, reason: 'Le prix est documenté comme favorable.' }),
      rule({ score: -40, reason: 'Le marchand présente un risque documenté.' }),
    ],
  }));
  assert.deepEqual(result.favorable.map((item) => item.reason), ['Le prix est documenté comme favorable.']);
  assert.deepEqual(result.unfavorable.map((item) => item.reason), ['Le marchand présente un risque documenté.']);
  assert.equal('recommendation' in result, false);
});

test('keeps score-zero applied rules neutral instead of calling them favorable or unfavorable', () => {
  const result = feature.classifyDecisionExplanation(decision({
    ruleResults: [rule({ score: 0, reason: 'Écart neutre dans cette règle.' })],
  }));
  assert.equal(result.favorable.length, 0);
  assert.equal(result.unfavorable.length, 0);
  assert.deepEqual(result.uncertainties, [{ kind: 'neutral', reason: 'Écart neutre dans cette règle.' }]);
});

test('uses only the persisted canonical reevaluation clause for change conditions', () => {
  const reason = "Je m'abstiens d'évaluer la position du prix, car les données sont trop anciennes. Conséquence : la comparaison serait fragile. Réévaluation : reprendre l'analyse lorsqu'un prix récent sera disponible.";
  const result = feature.classifyDecisionExplanation(decision({
    ruleResults: [rule({ applicable: false, reason })],
  }));
  assert.deepEqual(result.changeConditions, ["reprendre l'analyse lorsqu'un prix récent sera disponible"]);
  assert.deepEqual(result.uncertainties, [{ kind: 'not_applicable', reason }]);
});

test('does not invent a reevaluation condition when the persisted reason has none', () => {
  const result = feature.classifyDecisionExplanation(decision({
    ruleResults: [rule({ applicable: false, reason: 'Données insuffisantes sans condition explicite.' })],
  }));
  assert.deepEqual(result.changeConditions, []);
});

test('preserves extra insufficient-data engine reasons as uncertainties', () => {
  const ruleReason = 'Une règle factuelle manque de données.';
  const engineReason = 'La recommandation est suspendue faute de corroboration suffisante.';
  const result = feature.classifyDecisionExplanation(decision({
    recommendation: 'insufficient_data',
    reasons: [engineReason, ruleReason],
    ruleResults: [rule({ applicable: false, reason: ruleReason })],
  }));
  assert.equal(result.uncertainties.some((item) => item.kind === 'decision' && item.reason === engineReason), true);
  assert.equal(result.uncertainties.filter((item) => item.reason === ruleReason).length, 1);
});

test('uses only persisted evidence descriptions and deduplicates them', () => {
  const result = feature.classifyDecisionExplanation(decision({
    ruleResults: [rule({
      score: 40,
      reason: 'Raison documentée.',
      evidence: [
        { description: 'Prix total observé.' },
        { description: 'Prix total observé.' },
        { description: 'Médiane historique documentée.' },
      ],
    })],
  }));
  assert.deepEqual(result.favorable[0].evidence, ['Prix total observé.', 'Médiane historique documentée.']);
});

test('falls back to persisted decision reasons when legacy snapshots have no ruleResults', () => {
  const result = feature.classifyDecisionExplanation(decision({
    reasons: ['Motif historique conservé.'],
    ruleResults: [],
  }));
  assert.equal(result.hasRuleResults, false);
  assert.deepEqual(result.uncertainties, [{ kind: 'decision', reason: 'Motif historique conservé.' }]);
  assert.deepEqual(result.changeConditions, []);
});

test('integration remains authenticated, canonical and read-only', () => {
  const integrated = feature.integrate(fixture);
  assert.match(integrated, /client\.get\('\/decisions\//);
  assert.match(integrated, /currentUser/);
  assert.match(integrated, /localStorage\.getItem\('token'\)/);
  assert.doesNotMatch(integrated, /client\.(post|put|patch|delete)\s*\(/i);
  assert.match(integrated, /data-jvp5dh-detail/);
  assert.match(integrated, /stopPropagation\(\)/);
});

test('runtime does not introduce commercial influence, Gemini authority or purchase urgency', () => {
  const integrated = feature.integrate(fixture);
  const runtime = integrated.slice(integrated.indexOf(feature.MARKER));
  assert.doesNotMatch(runtime, /affiliate|commission|cashback|Gemini/i);
  assert.doesNotMatch(runtime, /ach[eè]te maintenant|d[eé]p[eê]che-toi|offre expire/i);
  assert.match(runtime, /ne garantissent jamais que la décision changera/i);
});

test('integration is idempotent and requires both P5.1A and P5.1B', () => {
  const once = feature.integrate(fixture);
  assert.equal(feature.integrate(once), once);
  assert.throws(
    () => feature.integrate('<!doctype html><html><head></head><body><script id="julvox-p5-decision-history-01-runtime"></script></body></html>'),
    /P5\.1B/i,
  );
  assert.throws(
    () => feature.integrate('<!doctype html><html><head></head><body><script id="julvox-p5-decision-timeline-01-runtime"></script></body></html>'),
    /P5\.1A/i,
  );
});
