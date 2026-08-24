'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_64_REFERRAL_ONBOARDING_TRUTH';
const LEGACY_TITLE = "title:'Parraine tes amis !'";
const LEGACY_TEXT = "text:'Invite un ami et vous gagnez tous les deux 7 jours Premium gratuits. C\\'est parti !'";
const SAFE_TITLE = "title:'Parrainage'";
const SAFE_TEXT = "text:'Les codes de parrainage restent enregistrés, mais aucune récompense Premium n’est actuellement attribuée.'";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_TITLE) !== 1) throw new Error(`P6.64 expected one legacy referral onboarding title, got ${countOf(html, LEGACY_TITLE)}`);
  if (countOf(html, LEGACY_TEXT) !== 1) throw new Error(`P6.64 expected one legacy referral reward promise, got ${countOf(html, LEGACY_TEXT)}`);

  let output = html.replace(LEGACY_TITLE, SAFE_TITLE);
  output = output.replace(LEGACY_TEXT, `${SAFE_TEXT} /* ${MARKER} */`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.64 marker count must be 1');
  if (html.includes(LEGACY_TITLE)) throw new Error('P6.64 legacy referral onboarding title remains');
  if (html.includes(LEGACY_TEXT)) throw new Error('P6.64 unsupported Premium referral reward promise remains');
  for (const required of [
    SAFE_TITLE,
    SAFE_TEXT,
    'P6_40_REFERRAL_REWARD_TRUTH',
    'Récompense Premium : suspendue',
    'P6_63_SCORE_FRAMING_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.64 required referral truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_64_REFERRAL_ONBOARDING_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
