'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH';
const ANCHOR = '\n\nlet favorites = new Set();';
const ACTIVE_SHARE = `\n\n// ${MARKER}\nfunction shareDealById(platform) {\n  const deal = window._currentDealOfDay;\n  if (!deal) { showToast('⚠️ Deal introuvable'); return; }\n  const sourceGap = Math.round(deal.discount_pct || 0);\n  const text = \`★ \${deal.name} à \${deal.current_price}€ (écart réf. source \${sourceGap}%) — Score Julvox : \${ui00ScoreLabel(deal.novadeal_score)}\`;\n  const url = \`https://julvox.com/?deal=\${deal.id}\`;\n  if (platform === 'copy') {\n    navigator.clipboard?.writeText(url)\n      .then(() => showToast('🔗 Lien copié !'))\n      .catch(() => showToast('🔗 ' + url));\n    return;\n  }\n  if (platform === 'native' && navigator.share) {\n    navigator.share({ title: deal.name, text, url }).catch(() => {});\n    return;\n  }\n  const urls = {\n    twitter: \`https://twitter.com/intent/tweet?text=\${encodeURIComponent(text)}&url=\${encodeURIComponent(url)}\`,\n    whatsapp: \`https://wa.me/?text=\${encodeURIComponent(text + ' ' + url)}\`,\n    telegram: \`https://t.me/share/url?url=\${encodeURIComponent(url)}&text=\${encodeURIComponent(text)}\`,\n  };\n  if (urls[platform]) window.open(urls[platform], '_blank', 'noopener,noreferrer');\n}\n`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const anchorCount = countOf(html, ANCHOR);
  if (anchorCount !== 1) throw new Error(`P6.74 expected one active deal-of-day injection anchor, got ${anchorCount}`);
  if (countOf(html, "shareDealById('") !== 4) throw new Error('P6.74 expected four visible deal-of-day share actions');
  if (!html.includes('function renderDealOfDay(deal, el) {')) throw new Error('P6.74 deal-of-day renderer missing');
  if (!html.includes('/* ══ ATTENTE 📷 SCAN & SQUAD — ATTENTE 1000 users ══')) throw new Error('P6.74 dormant share block boundary missing');
  const output = html.replace(ANCHOR, ACTIVE_SHARE + ANCHOR);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.74 marker count must be 1');
  if (countOf(html, ACTIVE_SHARE) !== 1) throw new Error('P6.74 active share handler count must be 1');
  for (const required of [
    "shareDealById('twitter')",
    "shareDealById('whatsapp')",
    "shareDealById('telegram')",
    "shareDealById('copy')",
    'window._currentDealOfDay = deal;',
    'function renderDealOfDay(deal, el) {',
    'const sourceGap = Math.round(deal.discount_pct || 0);',
    '(écart réf. source ${sourceGap}%)',
    "window.open(urls[platform], '_blank', 'noopener,noreferrer');",
    'P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH',
    'P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.74 required deal-of-day share boundary missing: ${required}`);
  }
  const markerIndex = html.indexOf(`// ${MARKER}`);
  const favoritesIndex = html.indexOf('let favorites = new Set();');
  const dormantIndex = html.indexOf('/* ══ ATTENTE 📷 SCAN & SQUAD — ATTENTE 1000 users ══');
  if (!(markerIndex >= 0 && favoritesIndex > markerIndex && dormantIndex > favoritesIndex)) {
    throw new Error('P6.74 active share handler is not placed in the active executable region');
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, ACTIVE_SHARE, assertHardened, hardenHtml, hardenPublicArtifact };
