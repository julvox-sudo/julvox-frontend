'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-score-signal-truth');

const fixture = `<!doctype html><html><head><style>
.deal-of-day::before{content:'🔥 DEAL DU JOUR'}
</style></head><body>
<button>⭐ Deal du jour</button>
<div class="sec-title">🏆 Deal du Jour</div><span>Score ≥ 90</span>
<div class="page-title">⭐ Deal du Jour</div>
<script>
function getVerdict(s) {
  void s;
  return {emoji:'ℹ️',text:'Informations insuffisantes',detail:'Aucun verdict sans preuve du Decision Engine'};
}
function dealCard(d) {
  const score = d.novadeal_score;
  return \`<span class="score-pill">\${score}</span>\${d.is_fake ? '<span class="fake-badge">⚠️ SUSPECT</span>' : (score>=90 ? '<span class="record-badge">🏆 RECORD</span>' : (score>=85 ? '<span class="rare-badge">⭐ RARE</span>' : ''))}\`;
}
async function openDealOfDay() {
  const res = await window.JULVOX_API.fetchResponse(API + '/deals?min_score=90&limit=1');
  const deal = (await res.json()).deal;
  if (!deal) document.body.textContent = 'Aucun deal exceptionnel aujourd\\'hui';
}
function renderDealOfDay(deal, el) {
  el.innerHTML = \`<div class="dotd-badge">⭐ DEAL DU JOUR</div>\`;
}
function swipe(deal) {
  const score = deal.novadeal_score;
  return \`
        \${deal.is_fake ? '<span class="fake-badge">⚠️ SUSPECT</span>' : ''}
        \${score >= 90 ? '<span class="record-badge">🏆 RECORD</span>' : score >= 85 ? '<span class="rare-badge">⭐ RARE</span>' : ''}
  \`;
}
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.56 removes score-derived rarity and excellence claims', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /🏆 RECORD/);
  assert.doesNotMatch(hardened, /⭐ RARE/);
  assert.doesNotMatch(hardened, /Aucun deal exceptionnel aujourd/);
  assert.doesNotMatch(hardened, />⭐ Deal du jour<\/button>/);
  assert.match(hardened, /P6_56_SCORE_SIGNAL_TRUTH/);
  assert.match(hardened, /Sélection par score/);
  assert.match(hardened, /SCORE ≥ 90/);
});

test('P6.56 preserves score as a signal and fail-closed verdict semantics', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /score-pill/);
  assert.match(hardened, /min_score=90&limit=1/);
  assert.match(hardened, /Informations insuffisantes/);
  assert.match(hardened, /⚠️ SUSPECT/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.56 is wired after P6.55 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p655Call = csp.indexOf('reconcileOnboardingPreferenceTruth();');
  const p656Call = csp.indexOf('reconcileScoreSignalTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p655Call >= 0 && p656Call > p655Call && readCall > p656Call);
});
