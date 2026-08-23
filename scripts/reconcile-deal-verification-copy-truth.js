'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_50_DEAL_VERIFICATION_COPY_TRUTH';

const REPLACEMENTS = [
  ['Vérification des offres réelles...', 'Chargement des offres disponibles...', 2, 'deal loading verification copy'],
  ['Aucun deal vérifié', 'Aucune offre disponible', 1, 'empty deal verification copy'],
  ['Aucune vente flash vérifiée pour le moment.', 'Aucune vente flash disponible pour le moment.', 1, 'flash verification copy'],
  ['Aucun résultat vérifié pour « ${query} ».', 'Aucun résultat disponible pour « ${query} ».', 1, 'search verification copy'],
  ['Les prix sont indicatifs et peuvent avoir changé depuis la dernière vérification.', 'Les prix sont indicatifs et peuvent avoir changé depuis la dernière observation disponible.', 1, 'footer verification copy'],
];

function replaceExpected(source, legacy, replacement, expected, label) {
  const count = source.split(legacy).length - 1;
  if (count !== expected) throw new Error(`P6.50 expected ${expected} ${label}, got ${count}`);
  return source.split(legacy).join(replacement);
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  for (const [legacy, replacement, expected, label] of REPLACEMENTS) {
    output = replaceExpected(output, legacy, replacement, expected, label);
  }
  output = output.replace('Chargement des offres disponibles...', `<!-- ${MARKER} -->Chargement des offres disponibles...`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.50 marker count must be 1, got ${markerCount}`);

  for (const [legacy] of REPLACEMENTS) {
    if (html.includes(legacy)) throw new Error(`P6.50 unsupported deal-verification copy remains: ${legacy}`);
  }

  for (const required of [
    'Chargement des offres disponibles...',
    'Aucune offre disponible',
    'Aucune vente flash disponible pour le moment.',
    'Aucun résultat disponible pour « ${query} ».',
    'dernière observation disponible',
    '✓ Vérifié',
    'Source externe vérifiée',
    'Chaque deal est vérifié toutes les heures.',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.50 required copy boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_50_DEAL_VERIFICATION_COPY_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, REPLACEMENTS, assertHardened, hardenHtml, hardenPublicArtifact };
