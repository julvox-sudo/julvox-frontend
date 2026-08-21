const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-decision-history-01');

const fixture = '<!doctype html><html><head></head><body><div id="julvoxDecisionHome"><button data-home-action="decisions">Mes décisions</button></div></body></html>';

test('decision history integration is idempotent and read-only', () => {
  const once = feature.integrate(fixture);
  const twice = feature.integrate(once);

  assert.equal(once, twice);
  assert.match(once, /id="julvox-p5-decision-history-01-runtime"/);
  assert.match(once, /window\.JULVOX_API/);
  assert.match(once, /\/decisions\?limit=20&offset=0/);
  assert.match(once, /\/decisions\//);
  assert.doesNotMatch(once, /client\.post\(/);
  assert.doesNotMatch(once, /client\.put\(/);
  assert.doesNotMatch(once, /client\.patch\(/);
  assert.doesNotMatch(once, /client\.delete\(/);
  assert.match(once, /Une ancienne décision reste un historique/);
  assert.match(once, /n’invente pas ce qui aurait changé/);
});

test('decision history preserves conservative engine outcomes without sales wording', () => {
  assert.equal(feature.decisionRecommendationLabel('insufficient_data'), 'INFORMATIONS INSUFFISANTES');
  assert.equal(feature.decisionRecommendationLabel('wait'), 'ATTENDRE');
  assert.equal(feature.decisionRecommendationLabel('observe'), 'À OBSERVER');
  assert.equal(feature.decisionRecommendationLabel('consider'), 'À CONSIDÉRER');
  assert.equal(feature.decisionRecommendationLabel('favorable'), 'FAVORABLE');
  assert.equal(feature.decisionRecommendationLabel('unexpected'), 'DÉCISION DISPONIBLE');
});

test('decision history refuses to integrate before the modern Julvox decision home', () => {
  assert.throws(
    () => feature.integrate('<!doctype html><html><head></head><body></body></html>'),
    /decision home/i,
  );
});
