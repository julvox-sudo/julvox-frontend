'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_63_SCORE_FRAMING_TRUTH';
const LEGACY_BADGE = '🏆 Score de confiance Julvox sur chaque deal';
const SAFE_BADGE = '★ Score Julvox sur chaque deal';
const LEGACY_EXPLANATION = 'Notre algorithme analyse chaque deal sur 100 points : remise réelle, fiabilité du marchand, historique des prix.';
const SAFE_EXPLANATION = 'Le Score Julvox synthétise plusieurs signaux disponibles sur 100 points. Ce score seul ne constitue pas une recommandation d’achat.';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_BADGE) !== 1) throw new Error(`P6.63 expected one legacy score-confidence badge, got ${countOf(html, LEGACY_BADGE)}`);
  if (countOf(html, LEGACY_EXPLANATION) !== 1) throw new Error(`P6.63 expected one legacy merchant-reliability score explanation, got ${countOf(html, LEGACY_EXPLANATION)}`);

  let output = html.replace(LEGACY_BADGE, SAFE_BADGE);
  output = output.replace(LEGACY_EXPLANATION, `${SAFE_EXPLANATION} /* ${MARKER} */`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.63 marker count must be 1');
  if (html.includes(LEGACY_BADGE)) throw new Error('P6.63 score is still framed as confidence');
  if (html.includes(LEGACY_EXPLANATION)) throw new Error('P6.63 static merchant reliability is still advertised as score evidence');
  for (const required of [
    SAFE_BADGE,
    SAFE_EXPLANATION,
    'P6_56_SCORE_SIGNAL_TRUTH',
    'P6_57_MERCHANT_TRUST_CARD_TRUTH',
    'P6_58_COMPARE_MERCHANT_TRUST_TRUTH',
    'P6_62_DEAL_LIVE_VERIFICATION_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.63 required score truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_63_SCORE_FRAMING_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
