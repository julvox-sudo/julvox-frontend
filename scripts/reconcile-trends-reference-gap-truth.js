'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_77_TRENDS_REFERENCE_GAP_TRUTH';
const LEGACY_LINE = '<div style="font-size:11px;color:var(--txt3)">${escHtml(d.store)} · −${Math.round(d.discount_pct||0)}%</div>';
const SAFE_LINE = '<div style="font-size:11px;color:var(--txt3)">${escHtml(d.store)} · Écart réf. ${Math.round(d.discount_pct||0)}%</div><!-- P6_77_TRENDS_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const count = countOf(html, LEGACY_LINE);
  if (count !== 1) throw new Error(`P6.77 expected one legacy trends discount line, got ${count}`);
  const output = html.replace(LEGACY_LINE, SAFE_LINE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.77 marker count must be 1');
  if (html.includes(LEGACY_LINE)) throw new Error('P6.77 legacy trends discount framing remains');
  for (const required of [
    SAFE_LINE,
    'id="bn-trends" onclick="openTrendsPage()"',
    'function openTrendsPage() {',
    'const topDeals = [...allDeals].sort((a,b) => ui00ScoreSortValue(b.novadeal_score, b.score)-ui00ScoreSortValue(a.novadeal_score, a.score)).slice(0,10);',
    'P6_76_FLASH_REFERENCE_GAP_TRUTH',
    'P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.77 required trends truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_77_TRENDS_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
