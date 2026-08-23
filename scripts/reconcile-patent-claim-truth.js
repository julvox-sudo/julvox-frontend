'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_52_PATENT_CLAIM_TRUTH';
const LEGACY_CLAIM = 'Score Julvox breveté';
const SAFE_CLAIM = `<!-- ${MARKER} -->Score Julvox`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const claimCount = countOf(html, LEGACY_CLAIM);
  if (claimCount !== 1) {
    throw new Error(`P6.52 expected exactly one unsupported patent claim, got ${claimCount}`);
  }

  const output = html.replace(LEGACY_CLAIM, SAFE_CLAIM);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.52 marker count must be 1, got ${markerCount}`);
  if (html.includes(LEGACY_CLAIM)) throw new Error('P6.52 unsupported patent-status claim remains');
  if (!html.includes(SAFE_CLAIM)) throw new Error('P6.52 truthful score label is missing');
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_52_PATENT_CLAIM_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
