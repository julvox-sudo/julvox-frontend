'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-guide-calendar-truth');

const fixture = [
  '<!doctype html><html><body>',
  "<p>Julvox analyse automatiquement des milliers de promotions chaque jour grâce à l'algorithme Julvox. Voici notre guide complet pour ne jamais rater un vrai bon deal.</p>",
  "<div>Pour l'électronique, les meilleures périodes sont : le Black Friday (novembre, -35% en moyenne), le Prime Day d'Amazon (juillet, -28%), les Soldes d'hiver (janvier, -20%) et les French Days (mai, -22%). Notre Calendrier Promos vous alerte automatiquement avant chaque événement.</div>",
  "<div>Julvox compare les prix sur plus de 50 marchands : Amazon.fr, Fnac, Darty, Boulanger, Cdiscount, Zalando, Nike, IKEA, Carrefour, Lidl, La Redoute, Booking.com et bien d'autres. L'extension Chrome analyse automatiquement la page sur laquelle vous vous trouvez.</div>",
  "<p>Meilleures périodes pour acheter chaque catégorie, basé sur l'historique des prix.</p>",
  "<div>📊 Ces données sont basées sur l'historique des prix Julvox. Les remises sont des moyennes constatées et peuvent varier selon les produits.</div>",
  '<script>',
  "async function loadCalendar(category){ return window.JULVOX_API.get('/calendar/' + encodeURIComponent(category)); }",
  'function renderCalendar(data, el, category){ return data?.all_events || []; }',
  'function runCompareV2(){ return true; }',
  '</script>',
  '</body></html>',
].join('\n');

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

test('P6.46 removes unsupported guide volume, automatic event-alert and Chrome-extension claims', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /des milliers de promotions chaque jour/);
  assert.doesNotMatch(hardened, /vous alerte automatiquement avant chaque événement/);
  assert.doesNotMatch(hardened, /plus de 50 marchands/);
  assert.doesNotMatch(hardened, /L'extension Chrome analyse automatiquement/);
  assert.match(hardened, /offres disponibles à partir des données effectivement accessibles/);
  assert.match(hardened, /Il ne crée pas d'alerte automatique avant les événements/);
  assert.match(hardened, /Aucune extension Chrome Julvox n'est actuellement requise ou annoncée/);
});

test('P6.46 identifies configured calendar values without pretending they are live observed averages', () => {
  const hardened = hardenHtml(fixture);
  assert.doesNotMatch(hardened, /basé sur l'historique des prix/);
  assert.doesNotMatch(hardened, /Ces données sont basées sur l'historique des prix Julvox/);
  assert.match(hardened, /Repères indicatifs du calendrier Julvox/);
  assert.match(hardened, /ne sont pas calculées en temps réel à partir de l'historique des prix/);
});

test('P6.46 preserves calendar API and comparison runtime syntax', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /window\.JULVOX_API\.get\('\/calendar\/'/);
  assert.match(hardened, /function renderCalendar/);
  assert.match(hardened, /function runCompareV2/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.46 is wired after P6.45 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const premiumCall = csp.indexOf('reconcilePremiumBenefitTruth();');
  const guideCall = csp.indexOf('reconcileGuideCalendarTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(premiumCall >= 0 && guideCall > premiumCall && readCall > guideCall);
});
