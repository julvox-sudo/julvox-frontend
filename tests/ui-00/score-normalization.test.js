'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  findArbitraryScoreFallbacks,
  normalizeNumericScore,
  normalizeScoreFallbacks,
  resolveNumericScore,
  scoreSortValue,
} = require('../../scripts/ui-00-score-contract.js');
const { finalizeHtml } = require('../../scripts/finalize-ui-00-production-truth.js');

test('score normalization accepts only finite values from 0 through 100', () => {
  assert.equal(normalizeNumericScore(0), 0);
  assert.equal(normalizeNumericScore(100), 100);
  assert.equal(normalizeNumericScore('42'), 42);
  for (const value of [null, undefined, '', '   ', NaN, Infinity, -1, 101, 'not-a-score']) {
    assert.equal(normalizeNumericScore(value), null, String(value));
  }
});

test('score resolution preserves zero and skips invalid candidates', () => {
  assert.equal(resolveNumericScore(0, 91), 0);
  assert.equal(resolveNumericScore(null, 91), 91);
  assert.equal(resolveNumericScore(' ', '88'), 88);
  assert.equal(resolveNumericScore(101, 82), 82);
  assert.equal(resolveNumericScore(undefined, null, 'bad'), null);
});

test('missing scores use an isolated sort sentinel without changing valid zero', () => {
  assert.equal(scoreSortValue(0, 91), 0);
  assert.equal(scoreSortValue(null, 91), 91);
  assert.equal(scoreSortValue(undefined, 'bad'), Number.NEGATIVE_INFINITY);
});

test('all historical and renamed score fallback variants use the central resolver', () => {
  const source = [
    'const a=(d.novadeal_score||d.score)||50;',
    'const b=(deal.novadeal_score ?? deal.score) ?? 75;',
    'const c=deal.score||deal.novadeal_score||50;',
    'const d=deal.merchant_trust_score||75;',
    'const e=p.score || 82;',
    'const risk=data.risk_score || 0;',
    "if(currentSort==='score')return rows.sort((a,b)=>(b.novadeal_score||0)-(a.novadeal_score||0));",
  ].join('\n');
  const transformed = normalizeScoreFallbacks(source);
  assert.doesNotMatch(transformed, /(?:\|\||\?\?)\s*(?:0|50|75|82)\b/);
  assert.match(transformed, /ui00ResolveScore\(d\.novadeal_score, d\.score\)/);
  assert.match(transformed, /ui00ResolveScore\(deal\.novadeal_score, deal\.score\)/);
  assert.match(transformed, /ui00ResolveScore\(deal\.merchant_trust_score\)/);
  assert.match(transformed, /ui00ResolveScore\(p\.score\)/);
  assert.match(transformed, /ui00ResolveScore\(data\.risk_score\)/);
  assert.match(transformed, /ui00ScoreSortValue\(b\.novadeal_score, b\.score\)/);
});

test('fallback detector rejects renamed equivalents but keeps thresholds and counters', () => {
  assert.equal(findArbitraryScoreFallbacks('const qualityIndex = offer.rating || 50;').length, 1);
  assert.equal(findArbitraryScoreFallbacks('const confidenceValue = backendScore ?? 75;').length, 1);
  assert.equal(findArbitraryScoreFallbacks('const filters = { score: saved.score ?? 50 };').length, 0);
  assert.equal(findArbitraryScoreFallbacks('const ok = score >= 50;').length, 0);
  assert.equal(findArbitraryScoreFallbacks("const trustPct = totalVotes > 0 ? ((d.votes_validate||0) / totalVotes) : null;").length, 0);
});

test('finalizer gives all four rendering paths an honest unavailable state', () => {
  const fixture = `<!doctype html><script>const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';
function dealCard(d){const score=(d.novadeal_score||d.score)||50;const scCls=score >= 90 ? 'sp-fire' : score >= 75 ? 'sp-green' : 'sp-gold';return \`<span class="score-pill \${scCls}">★ \${score}</span>\`}
function openDeal(d){const score=(d.novadeal_score||d.score)||50;return \`<div class="score-ring"><div class="score-num">\${score}</div><div class="score-sub2">/100</div></div>\`}
function renderTrustDetail(deal){const score=(deal.novadeal_score||deal.score)||50;const v=getVerdict(score);return v.text}
function injectLocalAnalysis(deal){const score=(deal.novadeal_score||deal.score)||50;return score}
</script>`;
  const output = finalizeHtml(fixture);
  assert.match(output, /function ui00ResolveScore/);
  assert.equal((output.match(/ui00ResolveScore\(/g) || []).length >= 5, true);
  assert.doesNotMatch(output, /(?:\|\||\?\?)\s*(?:50|75|82)\b/);
  assert.match(output, /Score indisponible/);
  assert.match(output, /score === null/);
});
