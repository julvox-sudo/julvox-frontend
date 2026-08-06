'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  MARKER,
  PRODUCT_REALIGN_MARKER,
  finalizeResiduals,
  verifyResiduals,
} = require('../../scripts/finalize-ui-00-residuals.js');
const {
  findUnjustifiedDecisionClaims,
} = require('../../scripts/product-realign-01a-contract.js');
const { namedFunctionSpans } = require('../../scripts/ui00-transforms/function-spans.js');

function historicalFixture() {
  return `
/* ui-00-residual-product-truth:applied-v3 */
function ui00ScoreLabel(value) { return value == null ? 'Score indisponible' : value + '/100'; }
function getVerdict(sc) {
  if (sc >= 90) return {emoji:'🔥',text:'Exceptionnel',detail:'Prix historiquement bas · Achetez maintenant'};
  if (sc >= 75) return {emoji:'✅',text:'Très bon deal',detail:'Excellent rapport qualité-prix'};
  if (sc >= 60) return {emoji:'👍',text:'Bon deal',detail:'Prix intéressant'};
  return {emoji:'⏳',text:'Attendez',detail:'Des prix plus bas sont probables'};
}
function renderTrustDetail(deal) { const merchant = deal.merchant || {}; return \`<div>Confiance marchand \${ui00ResolveScore(merchant.score)}/100 · tier \${merchant.tier || 2}</div>\`; }
function renderAnalysisResults(data, el) { const rarity=data.rarity||{}; const merchant=data.merchant||{}; const trend=data.trend||{}; el.innerHTML = (rarity.index||0) + ' Confiance marchand ' + ui00ResolveScore(merchant.score) + '/100 ' + (merchant.tier||2) + ' ' + Math.round((trend.drop_probability||0.5)*100) + '%'; }
function renderProductComparison(data, el) { el.innerHTML = (data.savings || 0) + '€ ' + data.comparisons.map(c => c.trust_score + '/100').join(''); }
function injectAnalysisInModal(data) { return Math.round((data.trend.drop_probability||0.5)*100) + '%'; }
function ui00ResolveScore(value) { return value == null ? null : Number(value); }
function ui00NumericScore(value) { const n=Number(value); return value == null || !Number.isFinite(n) ? null : n; }
function escHtml(value) { return String(value); }
function buildSmartUrl(value) { return value.url || '#'; }
const saved = deal.original_price ? (deal.original_price - deal.current_price).toFixed(2) : 0;
const summary = \`· Économie \${saved}€\`;
const badges = \`\${d.is_fake ? '<span class="fake-badge">⚠️ SUSPECT</span>' : (score>=90 ? '<span class="record-badge">🏆 RECORD</span>' : (score>=85 ? '<span class="rare-badge">⭐ RARE</span>' : ''))}\`;
const disabled = 'Prix historiquement bas — ';
const onboarding = 'Score de confiance NovaDeal™ sur chaque deal';
const metadata = 'Score de confiance algorithmique sur chaque deal.';
const ranking = 'Marchands les plus fiables ce mois';
const community = 'confiance communauté';
// 7. SCORE DE CONFIANCE DÉTAILLÉ (dans la modale)
// 8. MISE À JOUR MODALE avec confiance + rapport
// Le score de confiance est injecté directement dans openDeal via renderTrustDetail()
const scoreClass = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
const scoreEmoji = score >= 75 ? '🏆' : score >= 50 ? '✓' : '~';
const pill = \`<span class="comm-score-pill \${scoreClass}">\${scoreEmoji} NovaDeal™ \${score}</span>\`;
const merchantReport = \`<div>\${m.avg_score}</div>\`;
`;
}

function transformedFixture() {
  return finalizeResiduals(historicalFixture());
}

function evaluateNamedFunction(source, name, argumentsSource, context = {}) {
  const spans = namedFunctionSpans(source, name);
  assert.equal(spans.length, 1, `expected one ${name}`);
  const fn = source.slice(spans[0].start, spans[0].end);
  return vm.runInNewContext(`(${fn})(${argumentsSource})`, context);
}

test('historical fixture exposes the ten blocked claim families', () => {
  const claims = findUnjustifiedDecisionClaims(historicalFixture());
  for (const expected of [
    'score threshold produces a buy-now recommendation',
    'score threshold produces a wait recommendation',
    'score alone asserts an historical low',
    'missing drop probability becomes 50 percent',
    'missing merchant tier becomes tier 2',
    'missing rarity becomes index 0',
    'missing comparison savings become zero euros',
    'missing modal savings become zero euros',
    'merchant score is rendered without a missing-value guard',
    'merchant score is called confidence',
  ]) assert.ok(claims.includes(expected), expected);
});

test('neutralizes all unjustified decision claims and remains idempotent', () => {
  const result = transformedFixture();
  assert.ok(result.includes(PRODUCT_REALIGN_MARKER));
  assert.deepEqual(findUnjustifiedDecisionClaims(result), []);
  assert.equal(finalizeResiduals(result), result);
});

test('a high or low score alone never becomes a buy or wait recommendation', () => {
  const result = transformedFixture();
  for (const score of [95, 40]) {
    const verdict = evaluateNamedFunction(
      result,
      'getVerdict',
      String(score),
      { ui00NumericScore: value => Number(value) },
    );
    assert.match(verdict.text, /^Indicateur disponible :/);
    assert.match(verdict.detail, /ne constitue pas encore une recommandation d’achat/);
    assert.doesNotMatch(`${verdict.text} ${verdict.detail}`, /achetez|attendez|prix historiquement bas|prix plus bas/i);
  }
});

test('an absent score explicitly represents an unknown decision state', () => {
  const result = transformedFixture();
  const verdict = evaluateNamedFunction(
    result,
    'getVerdict',
    'null',
    { ui00NumericScore: () => null },
  );
  assert.equal(verdict.text, 'Indicateur indisponible');
  assert.match(verdict.detail, /preuves nécessaires ne sont pas réunies/);
});

test('promotion analysis does not invent rarity, merchant tier or drop probability', () => {
  const result = transformedFixture();
  const el = { innerHTML: '' };
  evaluateNamedFunction(
    result,
    'renderAnalysisResults',
    '{}, el, null, null',
    { el, ui00NumericScore: () => null },
  );
  assert.match(el.innerHTML, /Données insuffisantes/);
  assert.match(el.innerHTML, /Fiabilité non évaluée/);
  assert.match(el.innerHTML, /Niveau marchand non évalué/);
  assert.match(el.innerHTML, /Probabilité de baisse indisponible/);
  assert.doesNotMatch(el.innerHTML, /(?:^|\D)50%|tier\s*2|Indice\s*0|(?:null|undefined|NaN)%/i);
});

test('comparison does not turn unknown savings or merchant score into numbers', () => {
  const result = transformedFixture();
  const el = { innerHTML: '' };
  evaluateNamedFunction(
    result,
    'renderProductComparison',
    "{comparisons:[{store:'Test',price:10,url:'#'}]}, el",
    { el, ui00NumericScore: () => null, buildSmartUrl: value => value.url },
  );
  assert.match(el.innerHTML, /Économies indisponibles/);
  assert.match(el.innerHTML, /Fiabilité non évaluée/);
  assert.doesNotMatch(el.innerHTML, /(?:null|undefined|NaN)%|Économies\s*:\s*0/);
});

test('merchant wording no longer presents a score as confidence', () => {
  const result = transformedFixture();
  assert.doesNotMatch(result, /Confiance marchand|Score de confiance NovaDeal|Score de confiance algorithmique/i);
  assert.match(result, /Indicateur marchand/);
  assert.match(result, /Cet indicateur n’est pas un niveau de confiance/);
});


test('isolated transform fixtures without a verdict surface remain scoped', () => {
  const fixture = `${MARKER}
${PRODUCT_REALIGN_MARKER}
const legacyLabel = 'Confiance marchand';`;
  assert.equal(verifyResiduals(fixture), fixture);
});
