'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_80_BUDGET_SELECTION_COPY_TRUTH';
const LEGACY_TEXT = "Définissez votre budget — Julvox sélectionne automatiquement les meilleurs deals pour maximiser votre pouvoir d'achat.";
const SAFE_TEXT = "Définissez votre budget — Julvox sélectionne des offres compatibles avec ce montant à partir des données disponibles.";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const legacyCount = countOf(html, LEGACY_TEXT);
  if (legacyCount !== 1) throw new Error(`P6.80 expected one legacy Budget selection promise, got ${legacyCount}`);

  const output = html.replace(LEGACY_TEXT, `${SAFE_TEXT}<!-- ${MARKER} -->`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.80 marker count must be 1');
  if (html.includes(LEGACY_TEXT)) throw new Error('P6.80 legacy Budget best/maximize promise remains');
  if (countOf(html, SAFE_TEXT) !== 1) throw new Error('P6.80 truthful Budget selection copy must appear exactly once');
  for (const required of [
    "onclick=\"openPage('budgetPage')\"",
    'onclick="runBudgetOptimize()"',
    '/budget/optimize',
    'P6_69_BUDGET_SAVINGS_TRUTH',
    'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH',
    'P6_79_SWIPE_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.80 required Budget boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_80_BUDGET_SELECTION_COPY_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
