'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_45_PREMIUM_BENEFIT_TRUTH';

const LEGACY_NEWSLETTER_TITLE = '📬 Deals en avant-première';
const TRUTHFUL_NEWSLETTER_TITLE = '📬 Les meilleurs deals par email';

const LEGACY_FAQ = "Oui ! Jusqu'à 5 alertes prix sont gratuites. Avec Julvox Premium (4,99€/mois ou 39,99€/an), vous bénéficiez d'alertes illimitées, de l'accès aux deals en avant-première et du score Julvox détaillé.";
const TRUTHFUL_FAQ = "Oui ! Jusqu'à 5 alertes prix sont gratuites. Avec Julvox Premium (4,99€/mois ou 39,99€/an), la limite de 5 alertes est retirée : vos alertes prix sont illimitées.";

const LEGACY_PREMIUM_FEATURES = "${['✅ Alertes prix illimitées','✅ Deals en avant-première','✅ Score Julvox détaillé','✅ Favoris sur cet appareil','✅ Newsletter premium','✅ Sans publicité','✅ Support prioritaire'].map(f=>";
const TRUTHFUL_PREMIUM_FEATURES = "${['✅ Alertes prix illimitées'].map(f=>";

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = source.split(legacy).length - 1;
  if (count !== 1) {
    throw new Error(`P6.45 expected exactly one ${label}, got ${count}`);
  }
  return source.replace(legacy, replacement);
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  let output = replaceExactlyOnce(
    html,
    LEGACY_NEWSLETTER_TITLE,
    TRUTHFUL_NEWSLETTER_TITLE,
    'legacy newsletter early-access title',
  );
  output = replaceExactlyOnce(output, LEGACY_FAQ, TRUTHFUL_FAQ, 'legacy Premium FAQ');
  output = replaceExactlyOnce(
    output,
    LEGACY_PREMIUM_FEATURES,
    TRUTHFUL_PREMIUM_FEATURES,
    'legacy Premium feature list',
  );
  output = output.replace(
    TRUTHFUL_NEWSLETTER_TITLE,
    `<!-- ${MARKER} -->${TRUTHFUL_NEWSLETTER_TITLE}`,
  );

  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.45 marker count must be 1, got ${markerCount}`);
  }

  for (const unsupported of [
    'Deals en avant-première',
    'deals en avant-première',
    'Score Julvox détaillé',
    'Newsletter premium',
    'Sans publicité',
    'Support prioritaire',
  ]) {
    if (html.includes(unsupported)) {
      throw new Error(`P6.45 unsupported Premium/early-access claim remains: ${unsupported}`);
    }
  }

  for (const required of [
    TRUTHFUL_NEWSLETTER_TITLE,
    'Gratuit · Sans spam',
    "Jusqu'à 5 alertes prix sont gratuites",
    'vos alertes prix sont illimitées',
    TRUTHFUL_PREMIUM_FEATURES,
    'function payWithPayPal(plan)',
    'function payWithStripe(plan)',
    '/payments/paypal/create-subscription',
    '/payments/stripe/create-checkout',
    'newsletterEmail',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.45 required truthful capability/path missing: ${required}`);
    }
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_45_PREMIUM_BENEFIT_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
