'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_44_SUBSCRIPTION_CANCELLATION_TRUTH';
const LEGACY_LEGAL = "<strong>Résiliation :</strong> vous pouvez annuler votre abonnement à tout moment depuis votre espace PayPal ou Stripe. L'accès Premium reste actif jusqu'à la fin de la période payée.";
const TRUTHFUL_LEGAL = '<strong>Résiliation :</strong> si l’abonnement a été souscrit via PayPal, gérez-le depuis votre compte PayPal. Pour Stripe, Julvox n’expose pas encore de portail client de résiliation : contactez <a href="mailto:contact@julvox.com" style="color:var(--accent)">contact@julvox.com</a>. La date de fin d’accès Premium dépend de l’état confirmé par le prestataire de paiement.';
const LEGACY_PREMIUM_NOTE = '💳 Paiement sécurisé · Annulation à tout moment';
const TRUTHFUL_PREMIUM_NOTE = '💳 Paiement sécurisé · Résiliation selon le prestataire — voir CGU';

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  if ((html.split(LEGACY_LEGAL).length - 1) !== 1) {
    throw new Error('P6.44 expected exactly one legacy cancellation clause');
  }
  if ((html.split(LEGACY_PREMIUM_NOTE).length - 1) !== 1) {
    throw new Error('P6.44 expected exactly one legacy Premium cancellation note');
  }

  let output = html.replace(LEGACY_LEGAL, TRUTHFUL_LEGAL);
  output = output.replace(LEGACY_PREMIUM_NOTE, TRUTHFUL_PREMIUM_NOTE);
  output = output.replace(TRUTHFUL_LEGAL, `<!-- ${MARKER} -->${TRUTHFUL_LEGAL}`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.44 marker count must be 1, got ${markerCount}`);
  }

  for (const bad of [
    'annuler votre abonnement à tout moment depuis votre espace PayPal ou Stripe',
    "L'accès Premium reste actif jusqu'à la fin de la période payée",
    '💳 Paiement sécurisé · Annulation à tout moment',
  ]) {
    if (html.includes(bad)) {
      throw new Error(`P6.44 unsupported cancellation promise remains: ${bad}`);
    }
  }

  for (const required of [
    'si l’abonnement a été souscrit via PayPal, gérez-le depuis votre compte PayPal',
    'Julvox n’expose pas encore de portail client de résiliation',
    'mailto:contact@julvox.com',
    'La date de fin d’accès Premium dépend de l’état confirmé par le prestataire de paiement',
    TRUTHFUL_PREMIUM_NOTE,
    "function payWithPayPal(plan)",
    "function payWithStripe(plan)",
    '/payments/paypal/create-subscription',
    '/payments/stripe/create-checkout',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.44 required payment/cancellation truth missing: ${required}`);
    }
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_44_SUBSCRIPTION_CANCELLATION_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
