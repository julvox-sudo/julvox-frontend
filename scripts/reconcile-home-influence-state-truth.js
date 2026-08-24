'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_71_HOME_INFLUENCE_STATE_TRUTH';
const LEGACY_TITLE = 'Aucun changement important confirmé pour le moment.';
const LEGACY_DETAIL = 'Julvox affichera ici uniquement les informations vérifiées susceptibles de modifier une décision en cours.';
const SAFE_TITLE = 'Aucun suivi de changement n’est affiché ici pour le moment.';
const SAFE_DETAIL = 'Les informations vérifiées issues d’un suivi réel pourront être affichées ici lorsqu’elles seront disponibles.';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_TITLE) !== 1) throw new Error(`P6.71 expected one unverified no-change claim, got ${countOf(html, LEGACY_TITLE)}`);
  if (countOf(html, LEGACY_DETAIL) !== 1) throw new Error(`P6.71 expected one unsupported verified-influence promise, got ${countOf(html, LEGACY_DETAIL)}`);

  let output = html.replace(LEGACY_TITLE, SAFE_TITLE);
  output = output.replace(LEGACY_DETAIL, `${SAFE_DETAIL}<!-- ${MARKER} -->`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.71 marker count must be 1');
  if (html.includes(LEGACY_TITLE)) throw new Error('P6.71 unverified no-change claim remains');
  if (html.includes(LEGACY_DETAIL)) throw new Error('P6.71 unsupported verified-influence promise remains');
  for (const required of [
    SAFE_TITLE,
    SAFE_DETAIL,
    'data-product-realign="01B"',
    'pr01b-influence-copy',
    'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH',
    'P6_69_BUDGET_SAVINGS_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.71 required home truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_71_HOME_INFLUENCE_STATE_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
