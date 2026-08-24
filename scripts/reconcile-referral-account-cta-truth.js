'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_65_REFERRAL_ACCOUNT_CTA_TRUTH';
const LEGACY_CTA = 'Gagner du Premium →';
const SAFE_CTA = 'Voir le parrainage →';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_CTA) !== 1) {
    throw new Error(`P6.65 expected one stale referral account CTA, got ${countOf(html, LEGACY_CTA)}`);
  }

  const output = html.replace(LEGACY_CTA, `${SAFE_CTA}<!-- ${MARKER} -->`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.65 marker count must be 1');
  if (html.includes(LEGACY_CTA)) throw new Error('P6.65 stale Premium-earning CTA remains');
  for (const required of [
    SAFE_CTA,
    'onclick="openReferralPage()"',
    'P6_40_REFERRAL_REWARD_TRUTH',
    'Récompense Premium : suspendue',
    'P6_64_REFERRAL_ONBOARDING_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.65 required referral boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_65_REFERRAL_ACCOUNT_CTA_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
