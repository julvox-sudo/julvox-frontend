'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_67_PROMO_STATS_TRUTH';
const LEGACY_TOTAL_LABEL = 'Codes actifs';
const LEGACY_RATIO_LABEL = 'Confirmés ✅';
const SAFE_TOTAL_LABEL = 'Codes affichés';
const SAFE_RATIO_LABEL = '≥70% votes positifs';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_TOTAL_LABEL) !== 1) {
    throw new Error(`P6.67 expected one legacy active-code label, got ${countOf(html, LEGACY_TOTAL_LABEL)}`);
  }
  if (countOf(html, LEGACY_RATIO_LABEL) !== 1) {
    throw new Error(`P6.67 expected one legacy confirmed-code label, got ${countOf(html, LEGACY_RATIO_LABEL)}`);
  }

  let output = html.replace(LEGACY_TOTAL_LABEL, SAFE_TOTAL_LABEL);
  output = output.replace(LEGACY_RATIO_LABEL, `${SAFE_RATIO_LABEL}<!-- ${MARKER} -->`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.67 marker count must be 1');
  if (html.includes(LEGACY_TOTAL_LABEL)) throw new Error('P6.67 stale active-code label remains');
  if (html.includes(LEGACY_RATIO_LABEL)) throw new Error('P6.67 stale confirmed-code label remains');
  for (const required of [
    SAFE_TOTAL_LABEL,
    SAFE_RATIO_LABEL,
    'const working  = _allPromos.filter',
    '(p.votes_ok||0)/tot >= 0.7',
    'const verified = _allPromos.filter',
    'Vérifiés ✓',
    'P6_61_PROMO_VOTE_RATIO_TRUTH',
    'P6_66_ALERT_ONBOARDING_TARGET_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.67 required promo-stats boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_67_PROMO_STATS_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
