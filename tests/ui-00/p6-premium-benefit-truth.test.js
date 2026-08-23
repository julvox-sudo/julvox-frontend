'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-premium-benefit-truth');

const fixture = [
  '<!doctype html><html><body>',
  '<div class="newsletter-title">📬 Deals en avant-première</div>',
  '<div class="newsletter-sub">Reçois les meilleures offres selon ta fréquence.<br>Gratuit · Sans spam · Désabonnement en 1 clic.</div>',
  '<input id="newsletterEmail">',
  "<div>Oui ! Jusqu'à 5 alertes prix sont gratuites. Avec Julvox Premium (4,99€/mois ou 39,99€/an), vous bénéficiez d'alertes illimitées, de l'accès aux deals en avant-première et du score Julvox détaillé.</div>",
  '<script>',
  'function openPremiumPage(){',
  "  return `${['✅ Alertes prix illimitées','✅ Deals en avant-première','✅ Score Julvox détaillé','✅ Favoris sur cet appareil','✅ Newsletter premium','✅ Sans publicité','✅ Support prioritaire'].map(f=>`<div>${f}</div>`).join('')}`;",
  '}',
  "function payWithPayPal(plan){ return '/payments/paypal/create-subscription'; }",
  "function payWithStripe(plan){ return '/payments/stripe/create-checkout'; }",
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

test('P6.45 keeps only the proven Premium differential benefit', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.match(hardened, /Jusqu'à 5 alertes prix sont gratuites/);
  assert.match(hardened, /vos alertes prix sont illimitées/);
  assert.match(hardened, /✅ Alertes prix illimitées/);
  for (const unsupported of [
    /Deals en avant-première/,
    /deals en avant-première/,
    /Score Julvox détaillé/,
    /Newsletter premium/,
    /Sans publicité/,
    /Support prioritaire/,
  ]) assert.doesNotMatch(hardened, unsupported);
});

test('P6.45 keeps free newsletter and payment initiation real but removes early-access wording', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /Les meilleurs deals par email/);
  assert.match(hardened, /Gratuit · Sans spam/);
  assert.match(hardened, /newsletterEmail/);
  assert.match(hardened, /function payWithPayPal\(plan\)/);
  assert.match(hardened, /function payWithStripe\(plan\)/);
  assert.match(hardened, /\/payments\/paypal\/create-subscription/);
  assert.match(hardened, /\/payments\/stripe\/create-checkout/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.45 is wired after P6.44 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const cancellationCall = csp.indexOf('reconcileSubscriptionCancellationTruth();');
  const premiumCall = csp.indexOf('reconcilePremiumBenefitTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(cancellationCall >= 0 && premiumCall > cancellationCall && readCall > premiumCall);
});
