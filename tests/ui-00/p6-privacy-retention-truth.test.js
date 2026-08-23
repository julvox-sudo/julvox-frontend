'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-privacy-retention-truth');

const fixture = [
  '<!doctype html><html><body>',
  '<div>• Mots de passe hachés avec <strong>bcrypt</strong> (jamais stockés en clair)<br>• Communications chiffrées <strong>TLS 1.3</strong><br>• Données bancaires gérées exclusivement par Stripe/PayPal (PCI-DSS) — nous n\'y avons aucun accès<br>• Tokens d\'authentification JWT signés et à durée limitée<br>• Headers de sécurité HTTP (HSTS, CSP, X-Frame-Options)<br>• Journaux d\'accès conservés 12 mois maximum</div>',
  '<ul>',
  '<li>Mots de passe hachés (bcrypt) — jamais stockés en clair</li>',
  '<li>Données bancaires gérées par Stripe/PayPal (PCI-DSS) — nous n\'y avons aucun accès</li>',
  '<li>Chiffrement TLS 1.3 sur toutes les communications</li>',
  '<li>Notification CNIL sous 72h en cas de violation de données (Art. 33 RGPD)</li>',
  '<li>Email et prénom (lors de l\'inscription)</li>',
  '<li>Activité anonymisée (deals consultés, alertes)</li>',
  '<li>IP anonymisée après 30 jours</li>',
  '<li>Données de compte : jusqu\'à suppression + 1 an</li>',
  '<li>Facturation : 10 ans (obligation légale)</li>',
  '<li>Logs : 12 mois maximum</li>',
  '<li><strong>Railway</strong> (hébergement backend) — Serveurs EU — <a href="https://railway.app/legal/privacy" style="color:var(--accent)">Politique Railway</a></li>',
  '<li><strong>Vercel</strong> (hébergement frontend) — Serveurs EU/US — <a href="https://vercel.com/legal/privacy-policy">Politique Vercel</a></li>',
  '</ul>',
  '<script>function confirmDeleteAccount(){ return true; } function requestAccountDeletion(){ return confirmDeleteAccount(); }</script>',
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

test('P6.47 removes unsupported privacy, retention, hosting and fixed TLS claims', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);

  for (const legacy of [
    /TLS 1\.3/,
    /IP anonymisée après 30 jours/,
    /Activité anonymisée \(deals consultés, alertes\)/,
    /Données de compte : jusqu'à suppression \+ 1 an/,
    /Logs : 12 mois maximum/,
    /Journaux d'accès conservés 12 mois maximum/,
    /Railway<\/strong> \(hébergement backend\) — Serveurs EU/,
    /Notification CNIL sous 72h en cas de violation de données/,
  ]) assert.doesNotMatch(hardened, legacy);

  assert.match(hardened, /HTTPS\/TLS/);
  assert.match(hardened, /lorsqu’une violation présente un risque pour les droits et libertés/);
  assert.match(hardened, /Données liées au compte nécessaires aux fonctionnalités activées/);
  assert.match(hardened, /journaux applicatifs structurés expurgent les IP/);
  assert.match(hardened, /profil et le graphe local explicitement couvert sont anonymisés ou supprimés/);
  assert.match(hardened, /Julvox ne garantit pas une conservation de 12 mois/);
  assert.match(hardened, /région Railway de Singapour/);
});

test('P6.47 preserves proven security and provider boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /bcrypt/);
  assert.match(hardened, /Tokens d'authentification JWT signés et à durée limitée/);
  assert.match(hardened, /Stripe\/PayPal \(PCI-DSS\)/);
  assert.match(hardened, /https:\/\/railway\.app\/legal\/privacy/);
  assert.match(hardened, /https:\/\/vercel\.com\/legal\/privacy-policy/);
  assert.match(hardened, /Facturation : 10 ans \(obligation légale\)/);
  assert.match(hardened, /function confirmDeleteAccount/);
  assert.match(hardened, /function requestAccountDeletion/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.47 is wired after P6.46 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const guideCall = csp.indexOf('reconcileGuideCalendarTruth();');
  const privacyCall = csp.indexOf('reconcilePrivacyRetentionTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(guideCall >= 0 && privacyCall > guideCall && readCall > privacyCall);
});
