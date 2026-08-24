'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_58_COMPARE_MERCHANT_TRUST_TRUTH';
const LEGACY_BLOCK = `          <div class="compare-trust">\n            <span style="color:\${c.trust_score>=90?'var(--green)':'var(--gold)'}">★ \${c.trust_score}</span>\n            <span style="color:var(--txt3)">confiance</span>\n            \${c.novadeal_score ? \`<span style="color:var(--txt3)">· Julvox \${c.novadeal_score}</span>\` : ''}\n          </div>`;
const SAFE_BLOCK = `          <div class="compare-trust"><!-- ${MARKER} -->\n            \${ui00NumericScore(c.novadeal_score) === null\n              ? '<span style="color:var(--txt3)">Score Julvox indisponible</span>'\n              : \`<span style="color:var(--txt3)">Score Julvox \${ui00NumericScore(c.novadeal_score)}/100</span>\`}\n          </div>`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const count = countOf(html, LEGACY_BLOCK);
  if (count !== 1) throw new Error(`P6.58 expected exactly one static merchant-trust comparison block, got ${count}`);

  const output = html.replace(LEGACY_BLOCK, SAFE_BLOCK);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.58 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'c.trust_score>=90',
    '★ ${c.trust_score}',
    '<span style="color:var(--txt3)">confiance</span>',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.58 unsupported static merchant-trust comparison remains: ${unsupported}`);
  }

  for (const required of [
    SAFE_BLOCK,
    'function renderProductComparison(data, el)',
    "window.JULVOX_API.get('/products/' + encodeURIComponent(productId) + '/compare'",
    '${c.price}€',
    '${c.store}',
    '${c.vs_best > 0',
    'Score Julvox indisponible',
    'ui00NumericScore(c.novadeal_score)',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.58 required factual comparison boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_58_COMPARE_MERCHANT_TRUST_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
