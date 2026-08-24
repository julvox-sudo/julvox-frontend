'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_62_DEAL_LIVE_VERIFICATION_TRUTH';
const LEGACY_TITLE = "title:'Deals vérifiés à partir des données disponibles'";
const LEGACY_TEXT = "text:'Chaque deal est vérifié toutes les heures. Le badge ✓ indique que le prix est encore valide maintenant.'";
const SAFE_TITLE = "title:'Offres analysées à partir des données disponibles'";
const SAFE_TEXT = "text:'Les prix affichés proviennent des dernières observations disponibles et peuvent avoir changé depuis.'";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_TITLE) !== 1) throw new Error(`P6.62 expected one legacy onboarding title, got ${countOf(html, LEGACY_TITLE)}`);
  if (countOf(html, LEGACY_TEXT) !== 1) throw new Error(`P6.62 expected one legacy hourly verification claim, got ${countOf(html, LEGACY_TEXT)}`);

  let output = html.replace(LEGACY_TITLE, SAFE_TITLE);
  output = output.replace(LEGACY_TEXT, `${SAFE_TEXT} /* ${MARKER} */`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.62 marker count must be 1');
  if (html.includes(LEGACY_TITLE)) throw new Error('P6.62 legacy verified-deal title remains');
  if (html.includes(LEGACY_TEXT)) throw new Error('P6.62 unsupported hourly/live deal verification claim remains');
  for (const required of [
    SAFE_TITLE,
    SAFE_TEXT,
    'P6_50_DEAL_VERIFICATION_COPY_TRUTH',
    'P6_61_PROMO_VOTE_RATIO_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.62 required truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_62_DEAL_LIVE_VERIFICATION_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
