'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-deal-verification-copy-truth');

const fixture = `<!doctype html><html><body>
<footer>Les prix sont indicatifs et peuvent avoir changé depuis la dernière vérification.</footer>
<div id="flashRow">Aucune vente flash vérifiée pour le moment.</div>
<div>✓ Vérifié</div><div>Source externe vérifiée</div>
<script>
function showLoadingDeals(){ const state={}; state.textContent='Vérification des offres réelles...'; }
function loadDeals(deals, countEl){ if(countEl) countEl.textContent='Vérification des offres réelles...'; if(countEl) countEl.textContent=deals.length ? deals.length + ' offres reçues' : 'Aucun deal vérifié'; }
function runLocalSearch(query){ return \`Aucun résultat vérifié pour « \${query} ».\`; }
const hiddenOnboarding = 'Chaque deal est vérifié toutes les heures.';
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

test('P6.50 removes verification wording from general deal loading, empty and footer states', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal((hardened.match(/Chargement des offres disponibles\.\.\./g) || []).length, 2);
  assert.doesNotMatch(hardened, /Vérification des offres réelles/);
  assert.doesNotMatch(hardened, /Aucun deal vérifié/);
  assert.doesNotMatch(hardened, /Aucune vente flash vérifiée/);
  assert.doesNotMatch(hardened, /Aucun résultat vérifié/);
  assert.doesNotMatch(hardened, /dernière vérification/);
  assert.match(hardened, /Aucune offre disponible/);
  assert.match(hardened, /Aucune vente flash disponible/);
  assert.match(hardened, /Aucun résultat disponible/);
  assert.match(hardened, /dernière observation disponible/);
});

test('P6.50 preserves legitimate verified states and executable syntax', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /✓ Vérifié/);
  assert.match(hardened, /Source externe vérifiée/);
  assert.match(hardened, /Chaque deal est vérifié toutes les heures\./);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.50 is wired after P6.49 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const commentsCall = csp.indexOf('reconcileCommunityCommentsTruth();');
  const copyCall = csp.indexOf('reconcileDealVerificationCopyTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(commentsCall >= 0 && copyCall > commentsCall && readCall > copyCall);
});
