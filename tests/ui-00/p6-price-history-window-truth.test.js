'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-price-history-window-truth');

const fixture = `<!doctype html><html><body>
<p class="seo-p">Le score Julvox est un indicateur de 0 à 100 qui mesure la qualité réelle d'un deal. Il analyse l'historique de prix sur 90 jours, la réputation du marchand, la rareté du prix et détecte les fausses promos (prix gonflés avant les soldes).</p>
<div itemprop="text">Julvox analyse l'historique de prix sur 90 jours. Si le "prix original" affiché n'a jamais été pratiqué, ou si le prix a été gonflé artificiellement dans les 2 semaines précédant la promo, Julvox affiche le badge ⚠️ "Fausse promo suspectée".</div>
<script>
async function _loadAndRenderPriceChart(deal) {
  const result = await window.JULVOX_API.get('/deals/' + encodeURIComponent(deal.id));
  return result;
}
function renderPriceHistoryChart(history, containerEl) {
  containerEl.innerHTML = \`<div>📈 Historique des prix (90 jours)</div>\`;
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
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    if (typeMatch && !['text/javascript', 'application/javascript', 'module'].includes(typeMatch[1].toLowerCase())) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.53 removes unsupported fixed 90-day and two-week claims', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /Il analyse l'historique de prix sur 90 jours/);
  assert.doesNotMatch(hardened, /2 semaines précédant la promo/);
  assert.doesNotMatch(hardened, /Historique des prix \(90 jours\)/);
  assert.match(hardened, /P6_53_PRICE_HISTORY_WINDOW_TRUTH/);
  assert.match(hardened, /La couverture temporelle dépend des observations réellement disponibles/);
  assert.match(hardened, /Historique des prix disponible/);
});

test('P6.53 preserves factual history retrieval and removes score-as-decision implication', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /function _loadAndRenderPriceChart\(/);
  assert.match(hardened, /function renderPriceHistoryChart\(/);
  assert.match(hardened, /JULVOX_API\.get\('\/deals\/' \+ encodeURIComponent\(deal\.id\)\)/);
  assert.match(hardened, /ne constitue pas, à lui seul, une décision d’achat/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.53 is wired after P6.52 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p652Call = csp.indexOf('reconcilePatentClaimTruth();');
  const p653Call = csp.indexOf('reconcilePriceHistoryWindowTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p652Call >= 0 && p653Call > p652Call && readCall > p653Call);
});
