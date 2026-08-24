'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_57_MERCHANT_TRUST_CARD_TRUTH';

const LEGACY_STORE_TRUST = 'const STORE_TRUST = Object.freeze({}); /* UI-00: aucune vérité marchand locale */\n\n';
const LEGACY_TRUST_RUNTIME = `  const trust  = ui00ResolveScore(STORE_TRUST[d.store]);\n  const tCls   = trust >= 95 ? 'trust-high' : trust >= 88 ? 'trust-med' : 'trust-low';\n  const tLbl   = trust >= 95 ? \`✓\${trust}%\` : trust >= 88 ? \`~\${trust}%\` : \`?\${trust}%\`;\n`;
const LEGACY_STORE_ROW = '      <div class="deal-store"><div class="store-dot"></div>${escHtml(d.store)}<span class="deal-trust ${tCls}">${tLbl}</span></div>';
const SAFE_STORE_ROW = `      <div class="deal-store"><div class="store-dot"></div><!-- ${MARKER} -->\${escHtml(d.store)}</div>`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  for (const [label, needle] of [
    ['empty local STORE_TRUST declaration', LEGACY_STORE_TRUST],
    ['merchant trust runtime', LEGACY_TRUST_RUNTIME],
    ['merchant trust card badge', LEGACY_STORE_ROW],
  ]) {
    const count = countOf(html, needle);
    if (count !== 1) throw new Error(`P6.57 expected exactly one ${label}, got ${count}`);
  }

  let output = html.replace(LEGACY_STORE_TRUST, '');
  output = output.replace(LEGACY_TRUST_RUNTIME, '');
  output = output.replace(LEGACY_STORE_ROW, SAFE_STORE_ROW);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.57 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'STORE_TRUST[d.store]',
    'const STORE_TRUST = Object.freeze({})',
    '<span class="deal-trust ${tCls}">${tLbl}</span>',
    'const tLbl   = trust >= 95',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.57 unsupported local merchant-trust card truth remains: ${unsupported}`);
  }

  for (const required of [
    SAFE_STORE_ROW,
    'function renderTrustDetail(deal)',
    'Score marchand indisponible',
    'deal?.merchant || deal?.merchant_trust || null',
    'function dealCard(d)',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.57 required merchant-trust boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_57_MERCHANT_TRUST_CARD_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
