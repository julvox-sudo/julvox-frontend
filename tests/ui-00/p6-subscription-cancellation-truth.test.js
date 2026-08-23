'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-subscription-cancellation-truth');

const fixture = `<!doctype html><html><body>
<div><strong>Résiliation :</strong> vous pouvez annuler votre abonnement à tout moment depuis votre espace PayPal ou Stripe. L'accès Premium reste actif jusqu'à la fin de la période payée.</div>
<script>
function openPremiumPage(){ document.body.innerHTML = '<div>💳 Paiement sécurisé · Annulation à tout moment</div>'; }
function payWithPayPal(plan){ return '/payments/paypal/create-subscription'; }
function payWithStripe(plan){ return '/payments/stripe/create-checkout'; }
</script></body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1] || '')) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.44 removes unsupported Stripe self-cancellation and access-duration promises', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /annuler votre abonnement à tout moment depuis votre espace PayPal ou Stripe/);
  assert.doesNotMatch(hardened, /Premium reste actif jusqu'à la fin de la période payée/);
  assert.doesNotMatch(hardened, /Paiement sécurisé · Annulation à tout moment/);
  assert.match(hardened, /Julvox n’expose pas encore de portail client de résiliation/);
  assert.match(hardened, /mailto:contact@julvox\.com/);
  assert.match(hardened, /date de fin d’accès Premium dépend de l’état confirmé par le prestataire/);
});

test('P6.44 preserves the real payment initiation paths', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /function payWithPayPal\(plan\)/);
  assert.match(hardened, /function payWithStripe\(plan\)/);
  assert.match(hardened, /\/payments\/paypal\/create-subscription/);
  assert.match(hardened, /\/payments\/stripe\/create-checkout/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.44 is wired after P6.43 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const erasureCall = csp.indexOf('reconcileAccountErasureTruth();');
  const cancellationCall = csp.indexOf('reconcileSubscriptionCancellationTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(erasureCall >= 0 && cancellationCall > erasureCall && readCall > cancellationCall);
});
