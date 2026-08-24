'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_76_FLASH_REFERENCE_GAP_TRUTH';
const LEGACY_BADGE = '\'<div class="flash-badge">\' + (pct > 0 ? \'-\' + pct + \'%\' : \'Flash\') + \'</div>\' +';
const SAFE_BADGE = '\'<div class="flash-badge"\' + (pct > 0 ? \' style="background:var(--bg3);color:var(--txt2);border:1px solid var(--border)"\' : \'\') + \'>\' + (pct > 0 ? \'Écart réf. \' + pct + \'%\' : \'Flash\') + \'</div><!-- P6_76_FLASH_REFERENCE_GAP_TRUTH -->\' +';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const count = countOf(html, LEGACY_BADGE);
  if (count !== 1) throw new Error(`P6.76 expected one legacy flash discount badge, got ${count}`);
  const output = html.replace(LEGACY_BADGE, SAFE_BADGE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.76 marker count must be 1');
  if (html.includes(LEGACY_BADGE)) throw new Error('P6.76 legacy flash discount badge remains');
  for (const required of [
    SAFE_BADGE,
    'const pct = f.discount_pct ? Math.round(f.discount_pct) : 0;',
    "window.JULVOX_API.get('/deals?is_flash=true&limit=8'",
    'function renderFlashLive(flashDeals) {',
    'function startCountdownsLive(flashDeals) {',
    "element.textContent = 'Expiration indisponible'",
    'P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH',
    'P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.76 required flash truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_76_FLASH_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
