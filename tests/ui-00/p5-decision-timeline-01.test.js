const test = require('node:test');
const assert = require('node:assert/strict');
const feature = require('../../scripts/julvox-p5-decision-timeline-01');

function snapshot({ subject = 'tv-65', recommendation = 'wait', confidence = 'low', priceMinor = null, currency = 'EUR', market = 'FR', condition = 'new' } = {}) {
  const facts = {};
  if (priceMinor != null) {
    facts.pricePosition = {
      currentTotalMinor: priceMinor,
      currency,
      market,
      condition,
      priceBasis: 'total_payable',
    };
  }
  return {
    decision: {
      recommendation,
      confidence,
      context: { subjectId: subject, facts },
    },
  };
}

const fixture = '<!doctype html><html><head></head><body><div id="julvoxDecisionHome"></div><script id="julvox-p5-decision-history-01-runtime"></script></body></html>';

test('orders several decisions of the same subject chronologically and excludes other subjects', () => {
  const items = [
    { decisionId: 'c', subjectId: 'tv-65', recommendation: 'favorable', observedAt: '2026-09-02T10:00:00+00:00' },
    { decisionId: 'x', subjectId: 'phone', recommendation: 'wait', observedAt: '2026-08-10T10:00:00+00:00' },
    { decisionId: 'a', subjectId: 'tv-65', recommendation: 'insufficient_data', observedAt: '2026-08-12T10:00:00+00:00' },
    { decisionId: 'b', subjectId: 'tv-65', recommendation: 'wait', observedAt: '2026-08-18T10:00:00+00:00' },
  ];
  assert.deepEqual(feature.normalizeTimelineItems(items, 'tv-65').map((item) => item.decisionId), ['a', 'b', 'c']);
});

test('preserves prudent and insufficient-data verdict labels', () => {
  assert.equal(feature.recommendationLabel('insufficient_data'), 'INFORMATIONS INSUFFISANTES');
  assert.equal(feature.recommendationLabel('wait'), 'ATTENDRE');
  assert.equal(feature.recommendationLabel('observe'), 'À OBSERVER');
});

test('reports only explicit persisted changes and never invents causality', () => {
  const diff = feature.compareSnapshots(
    snapshot({ recommendation: 'wait', confidence: 'low', priceMinor: 70000 }),
    snapshot({ recommendation: 'favorable', confidence: 'high', priceMinor: 62000 }),
  );
  assert.equal(diff.status, 'FACTUAL_DIFF');
  assert.deepEqual(diff.changes.map((change) => change.type), ['DECISION_CHANGED', 'CONFIDENCE_CHANGED', 'PRICE_CHANGED']);
  assert.equal(diff.changes[2].fromMinor, 70000);
  assert.equal(diff.changes[2].toMinor, 62000);
  assert.equal('cause' in diff, false);
});

test('returns UNKNOWN when comparable factual snapshots are unavailable', () => {
  const diff = feature.compareSnapshots(
    snapshot({ recommendation: 'wait', confidence: 'low' }),
    snapshot({ recommendation: 'favorable', confidence: 'medium' }),
  );
  assert.equal(diff.status, 'UNKNOWN');
  assert.equal(diff.reason, 'NO_SUPPORTED_COMPARABLE_FACT_CHANGE');
  assert.deepEqual(diff.changes.map((change) => change.type), ['DECISION_CHANGED', 'CONFIDENCE_CHANGED']);
});

test('does not call a price change factual when currency, market or condition differs', () => {
  for (const current of [
    snapshot({ priceMinor: 62000, currency: 'USD' }),
    snapshot({ priceMinor: 62000, market: 'BE' }),
    snapshot({ priceMinor: 62000, condition: 'refurbished' }),
  ]) {
    const diff = feature.compareSnapshots(snapshot({ priceMinor: 70000 }), current);
    assert.equal(diff.status, 'UNKNOWN');
    assert.equal(diff.changes.some((change) => change.type === 'PRICE_CHANGED'), false);
  }
});

test('marks only the presence of a supported price snapshot when missing data changes', () => {
  const diff = feature.compareSnapshots(snapshot(), snapshot({ priceMinor: 62000 }));
  assert.equal(diff.status, 'FACTUAL_DIFF');
  assert.deepEqual(diff.changes, [{
    type: 'MISSING_DATA_CHANGED',
    field: 'pricePosition',
    fromAvailable: false,
    toAvailable: true,
  }]);
});

test('rejects cross-subject comparisons', () => {
  const diff = feature.compareSnapshots(snapshot({ subject: 'tv-65', priceMinor: 70000 }), snapshot({ subject: 'phone', priceMinor: 62000 }));
  assert.deepEqual(diff, { status: 'UNKNOWN', changes: [], reason: 'SUBJECT_MISMATCH' });
});

test('runtime stays authenticated, read-only, non-commercial and uses canonical decision endpoints', () => {
  const integrated = feature.integrate(fixture);
  assert.match(integrated, /\/decisions\?limit=100/);
  assert.match(integrated, /\/decisions\?limit=20&subjectId=/);
  assert.match(integrated, /\/decisions\//);
  assert.match(integrated, /currentUser/);
  assert.match(integrated, /localStorage\.getItem\('token'\)/);
  assert.doesNotMatch(integrated, /client\.(post|put|patch|delete)\s*\(/i);
  const runtime = integrated.slice(integrated.indexOf('julvox-p5-decision-timeline-01-runtime'));
  assert.doesNotMatch(runtime, /affiliate|commission|cashback/i);
  assert.match(runtime, /information indisponible/i);
  assert.match(runtime, /n’est jamais présentée comme la cause/i);
});

test('integration is idempotent and requires P5.1A first', () => {
  const once = feature.integrate(fixture);
  assert.equal(feature.integrate(once), once);
  assert.throws(
    () => feature.integrate('<!doctype html><html><head></head><body><div id="julvoxDecisionHome"></div></body></html>'),
    /P5\.1A/i,
  );
});
