'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_61_PROMO_VOTE_RATIO_TRUTH';
const REPLACEMENTS = [
  ['✅ ${pct}% de réussite', '✅ ${pct}% de votes positifs'],
  ['⚠️ ${pct}% de réussite', '⚠️ ${pct}% de votes positifs'],
  ['❌ ${pct}% — peut-être expiré', '❌ ${pct}% de votes positifs'],
];

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  let output = html;
  for (const [legacy, safe] of REPLACEMENTS) {
    const count = countOf(output, legacy);
    if (count !== 1) throw new Error(`P6.61 expected exactly one promo vote label '${legacy}', got ${count}`);
    output = output.replace(legacy, safe);
  }
  const anchor = "const isVerified = p.source === 'verified' || p.is_verified;";
  if (countOf(output, anchor) !== 1) throw new Error('P6.61 expected one isVerified boundary');
  output = output.replace(anchor, `${anchor} /* ${MARKER} */`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.61 marker count must be 1');
  for (const [legacy] of REPLACEMENTS) if (html.includes(legacy)) throw new Error(`P6.61 unsupported promo interpretation remains: ${legacy}`);
  const required = [
    '✅ ${pct}% de votes positifs',
    '⚠️ ${pct}% de votes positifs',
    '❌ ${pct}% de votes positifs',
    'const total      = p.votes_ok + p.votes_ko;',
    'const pct        = total > 0 ? Math.round(p.votes_ok / total * 100) : null;',
    "const isVerified = p.source === 'verified' || p.is_verified;",
    "${isVerified ? '✓ Vérifié' : '🤝 Communauté'}",
    'P6_60_PROMO_POINTS_TRUTH',
  ];
  for (const value of required) if (!html.includes(value)) throw new Error(`P6.61 required promo truth boundary missing: ${value}`);
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_61_PROMO_VOTE_RATIO_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
