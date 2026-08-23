'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_46_GUIDE_CALENDAR_TRUTH';

const REPLACEMENTS = [
  [
    "Julvox analyse automatiquement des milliers de promotions chaque jour grâce à l'algorithme Julvox. Voici notre guide complet pour ne jamais rater un vrai bon deal.",
    "Julvox analyse les offres disponibles à partir des données effectivement accessibles. Le guide ci-dessous explique les indicateurs et limites utiles pour évaluer un deal sans promettre un volume fixe d'offres.",
    'guide volume claim',
  ],
  [
    "Pour l'électronique, les meilleures périodes sont : le Black Friday (novembre, -35% en moyenne), le Prime Day d'Amazon (juillet, -28%), les Soldes d'hiver (janvier, -20%) et les French Days (mai, -22%). Notre Calendrier Promos vous alerte automatiquement avant chaque événement.",
    "Le Calendrier Promos affiche des repères indicatifs configurés par catégorie. Il ne crée pas d'alerte automatique avant les événements ; pour être prévenu d'une baisse de prix, utilisez une alerte produit.",
    'automatic event alert claim',
  ],
  [
    "Julvox compare les prix sur plus de 50 marchands : Amazon.fr, Fnac, Darty, Boulanger, Cdiscount, Zalando, Nike, IKEA, Carrefour, Lidl, La Redoute, Booking.com et bien d'autres. L'extension Chrome analyse automatiquement la page sur laquelle vous vous trouvez.",
    "Julvox compare les prix lorsque plusieurs offres marchandes exploitables sont disponibles pour un même produit. Aucune extension Chrome Julvox n'est actuellement requise ou annoncée par ce service web.",
    'merchant-count and Chrome extension claim',
  ],
  [
    "Meilleures périodes pour acheter chaque catégorie, basé sur l'historique des prix.",
    'Repères indicatifs du calendrier Julvox pour chaque catégorie.',
    'calendar historical-price intro',
  ],
  [
    "📊 Ces données sont basées sur l'historique des prix Julvox. Les remises sont des moyennes constatées et peuvent varier selon les produits.",
    "📊 Les remises affichées sont des repères indicatifs configurés dans le calendrier Julvox ; elles ne sont pas calculées en temps réel à partir de l'historique des prix.",
    'calendar observed-average footnote',
  ],
];

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = source.split(legacy).length - 1;
  if (count !== 1) {
    throw new Error(`P6.46 expected exactly one ${label}, got ${count}`);
  }
  return source.replace(legacy, replacement);
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  for (const [legacy, replacement, label] of REPLACEMENTS) {
    output = replaceExactlyOnce(output, legacy, replacement, label);
  }

  const anchor = 'Julvox analyse les offres disponibles à partir des données effectivement accessibles.';
  output = output.replace(anchor, `<!-- ${MARKER} -->${anchor}`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.46 marker count must be 1, got ${markerCount}`);
  }

  for (const unsupported of [
    'des milliers de promotions chaque jour',
    'vous alerte automatiquement avant chaque événement',
    'compare les prix sur plus de 50 marchands',
    "L'extension Chrome analyse automatiquement",
    "Meilleures périodes pour acheter chaque catégorie, basé sur l'historique des prix.",
    "Ces données sont basées sur l'historique des prix Julvox",
  ]) {
    if (html.includes(unsupported)) {
      throw new Error(`P6.46 unsupported public guide/calendar claim remains: ${unsupported}`);
    }
  }

  for (const required of [
    'Le Calendrier Promos affiche des repères indicatifs configurés par catégorie',
    "Il ne crée pas d'alerte automatique avant les événements",
    "Aucune extension Chrome Julvox n'est actuellement requise ou annoncée par ce service web",
    'Repères indicatifs du calendrier Julvox pour chaque catégorie',
    "elles ne sont pas calculées en temps réel à partir de l'historique des prix",
    "window.JULVOX_API.get('/calendar/'",
    'function renderCalendar',
    'function runCompareV2',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.46 required truthful guide/calendar path missing: ${required}`);
    }
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_46_GUIDE_CALENDAR_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  REPLACEMENTS,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
