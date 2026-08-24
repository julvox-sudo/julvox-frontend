'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_56_SCORE_SIGNAL_TRUTH';

const REPLACEMENTS = [
  ["content:'🔥 DEAL DU JOUR'", "content:'★ SÉLECTION SCORE'"],
  ['>⭐ Deal du jour</button>', '>★ Sélection score</button>'],
  ['<div class="sec-title">🏆 Deal du Jour</div>', `<!-- ${MARKER} --><div class="sec-title">★ Sélection par score</div>`],
  ['<div class="page-title">⭐ Deal du Jour</div>', '<div class="page-title">★ Sélection par score</div>'],
  ['<div class="dotd-badge">⭐ DEAL DU JOUR</div>', '<div class="dotd-badge">★ SCORE ≥ 90</div>'],
  ["Aucun deal exceptionnel aujourd\\'hui", 'Aucune offre avec score ≥ 90 actuellement'],
  ["${d.is_fake ? '<span class=\"fake-badge\">⚠️ SUSPECT</span>' : (score>=90 ? '<span class=\"record-badge\">🏆 RECORD</span>' : (score>=85 ? '<span class=\"rare-badge\">⭐ RARE</span>' : ''))}", "${d.is_fake ? '<span class=\"fake-badge\">⚠️ SUSPECT</span>' : ''}"],
  ["        ${score >= 90 ? '<span class=\"record-badge\">🏆 RECORD</span>' : score >= 85 ? '<span class=\"rare-badge\">⭐ RARE</span>' : ''}\n", ''],
];

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  for (const [legacy, replacement] of REPLACEMENTS) {
    const count = countOf(output, legacy);
    if (count !== 1) throw new Error(`P6.56 expected exactly one legacy score-derived claim, got ${count}: ${legacy.slice(0, 80)}`);
    output = output.replace(legacy, replacement);
  }

  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.56 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    '🏆 RECORD',
    '⭐ RARE',
    "Aucun deal exceptionnel aujourd\\'hui",
    '<div class="sec-title">🏆 Deal du Jour</div>',
    '<div class="page-title">⭐ Deal du Jour</div>',
    '<div class="dotd-badge">⭐ DEAL DU JOUR</div>',
    '>⭐ Deal du jour</button>',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.56 unsupported score-derived quality claim remains: ${unsupported}`);
  }

  for (const required of [
    '★ Sélection par score',
    '★ SCORE ≥ 90',
    'Aucune offre avec score ≥ 90 actuellement',
    "API + '/deals?min_score=90&limit=1'",
    'function getVerdict(s)',
    "text:'Informations insuffisantes'",
    'score-pill',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.56 required score-signal boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_56_SCORE_SIGNAL_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
