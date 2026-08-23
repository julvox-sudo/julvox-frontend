'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-newsletter-preferences-truth');

const fixture = `<html><body><script>
async function openNewsletterPrefs() {
  const prefs = {};
  const currentUser = {};
  const minScore = prefs?.min_score || 75;
  const isSubscribed = true;
  const html = \`
    \${prefs?.email || currentUser?.email || ''}
    \${isSubscribed
        ? \`<button onclick="unsubscribeNewsletter()" style="background:rgba(231,76,60,.12);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">Se désabonner</button>\`
        : \`<button>S'abonner</button>\`
      }
    \${[
          {v:'daily',  e:'☀️', t:'Tous les jours',   s:'Chaque matin'},
          {v:'weekly', e:'📅', t:'1x par semaine',   s:'Le jour de ton choix'},
          {v:'twice',  e:'⚡', t:'2x par semaine',   s:'Lun + Jeu'},
          {v:'flash',  e:'🔥', t:'Flash only',       s:'à partir des données disponibles'},
        ].map(o => o.v).join('')}
    <!-- Score minimum -->
    <input id="prefsMinScore" value="\${minScore}">
    <div>Score Julvox minimum</div>
    <!-- Save button -->
    <button>Save</button>
  \`;
}
async function saveNewsletterPrefs() {
  const frequency = {type:'daily', hour:8};
  const categories = ['all'];
  const minScore = parseInt(document.getElementById('prefsMinScore')?.value || '75');

  const req = {
      body: JSON.stringify({ frequency, categories, min_score: minScore })
  };
  return req;
}
</script>
<!-- runtime-contract:runtime.enhancements_script -->
</body></html>`;

test('P6.38 removes newsletter controls that no longer have backend authority', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /prefsMinScore/);
  assert.doesNotMatch(hardened, /Score Julvox minimum/);
  assert.doesNotMatch(hardened, /unsubscribeNewsletter\(\)/);
  assert.doesNotMatch(hardened, /\{v:'flash'/);
  assert.match(hardened, /Désabonnement via le lien présent dans chaque email Julvox\./);
});

test('P6.38 sends only canonical newsletter preferences', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /body: JSON\.stringify\(\{ frequency, categories \}\)/);
  assert.doesNotMatch(hardened, /min_score: minScore/);
  assert.match(hardened, /const safePrefsEmail = escHtml/);
  assert.match(hardened, /\$\{safePrefsEmail\}/);
});

test('P6.38 is wired after P6.37 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const squadCall = csp.indexOf('hardenDealSquadHtml();');
  const newsletterCall = csp.indexOf('reconcileNewsletterPreferencesTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(squadCall >= 0 && newsletterCall > squadCall && readCall > newsletterCall);
});
