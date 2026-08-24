'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_78_COMMUNITY_REFERENCE_GAP_TRUTH';
const LEGACY_REFERENCE = '${d.original_price !== null ? `<div style="font-size:11px;color:var(--txt3);text-decoration:line-through">${formatPrice(d.original_price)}</div>` : \'\'}';
const SAFE_REFERENCE = '${d.original_price !== null ? `<div style="font-size:11px;color:var(--txt3)">Réf. communautaire ${formatPrice(d.original_price)}</div>` : \'\'}';
const LEGACY_GAP = '${pct > 0 ? `<span class="comm-pct-badge">−${pct}%</span>` : \'\'}';
const SAFE_GAP = '${pct > 0 ? `<span style="display:inline-block;margin-top:3px;font-size:10px;font-weight:700;color:var(--txt2);background:var(--bg3);border:1px solid var(--border);border-radius:999px;padding:2px 6px">Écart réf. communautaire ${pct}%</span>` : \'\'}<!-- P6_78_COMMUNITY_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const referenceCount = countOf(html, LEGACY_REFERENCE);
  const gapCount = countOf(html, LEGACY_GAP);
  if (referenceCount !== 1) throw new Error(`P6.78 expected one legacy community reference price, got ${referenceCount}`);
  if (gapCount !== 1) throw new Error(`P6.78 expected one legacy community percentage gap, got ${gapCount}`);

  let output = html.replace(LEGACY_REFERENCE, SAFE_REFERENCE);
  output = output.replace(LEGACY_GAP, SAFE_GAP);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.78 marker count must be 1');
  if (html.includes(LEGACY_REFERENCE)) throw new Error('P6.78 struck-through community reference remains');
  if (html.includes(LEGACY_GAP)) throw new Error('P6.78 promotional community percentage remains');
  for (const required of [
    SAFE_REFERENCE,
    SAFE_GAP,
    'const pct = d.original_price && d.price ? Math.max(0, Math.min(100, Math.round((1 - d.price / d.original_price) * 100))) : 0;',
    'Déclaration communautaire · non vérifiée',
    '/community/deals?status=approved&sort=',
    'id="bn-community" onclick="openCommunityPage()"',
    'P6_35_COMMUNITY_CLAIM_CONTRACT_DOM_TRUST',
    'P6_77_TRENDS_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.78 required community truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_78_COMMUNITY_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
