'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = '// ── COMPARE ───────────────────────────────────────────────────';
const END = '// ── FLASH PAGE ────────────────────────────────────────────────';
const MARKER = 'P6_30_DYNAMIC_COMPARE_HTML_TRUST';

const HARDENED_COMPARE = `${START}
// ${MARKER}
function runCompare() {
  const input = document.getElementById('compareInput');
  const res = document.getElementById('compareResults');
  const trust = window.JulvoxDynamicDealTrust;
  if (!res || !trust) return;

  const q = trust.text(input && input.value ? input.value.trim().toLowerCase() : '', 160);
  if (!q) { showToast('⚠️ Tape un produit'); return; }
  const safeQ = trust.html(q);

  const candidates = (Array.isArray(allDeals) ? allDeals : []).map(function(deal) {
    return trust.normalizeDeal(deal, false);
  }).filter(Boolean);
  const matches = candidates.filter(function(deal) {
    return String(deal.name || '').toLowerCase().includes(q) || String(deal.brand || '').toLowerCase().includes(q);
  }).sort(function(a, b) {
    return Number(a.current_price || 0) - Number(b.current_price || 0);
  });

  if (!matches.length) {
    res.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt3)"><div style="font-size:36px;margin-bottom:10px">🔍</div><div>Aucun résultat pour "' + safeQ + '"</div></div>';
    return;
  }

  const best = matches[0];
  res.innerHTML = '<p style="font-size:13px;color:var(--txt2);margin-bottom:14px">' + matches.length + ' offre' + (matches.length > 1 ? 's' : '') + ' pour <strong style="color:var(--txt)">"' + safeQ + '"</strong></p><div class="cmp-grid">' + matches.map(function(deal) {
    const safeStore = trust.html(deal.store || '');
    const safeUrl = trust.html(trust.httpUrl(buildSmartUrl(deal)) || '#');
    const original = Number(deal.original_price);
    const discount = Number(deal.discount_pct);
    const bestBadge = deal === best ? '<div class="cmp-best">🏆 Meilleur prix</div>' : '';
    const oldPrice = Number.isFinite(original) && original > 0 ? '<div style="font-size:12px;color:var(--txt3);text-decoration:line-through">' + formatPrice(original) + '</div>' : '';
    const discountHtml = Number.isFinite(discount) && discount > 0 ? '<div style="background:var(--accent);color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;align-self:flex-start">−' + Math.round(Math.max(0, Math.min(100, discount))) + '%</div>' : '';
    return '<div class="cmp-card ' + (deal === best ? 'best' : '') + '">' + bestBadge + '<div style="font-size:12px;color:var(--txt3)">' + safeStore + '</div><div style="font-family:\\'Syne\\',sans-serif;font-size:22px;font-weight:700">' + formatPrice(Number(deal.current_price)) + '</div>' + oldPrice + discountHtml + '<a style="display:block;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px;color:var(--txt2);font-size:13px;text-align:center;margin-top:4px;transition:var(--trans)" href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">Voir l\\'offre →</a></div>';
  }).join('') + '</div>';
}

`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) return html;
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.30 compare hardening could not locate canonical compare block');
  }
  const original = html.slice(start, end);
  if (!original.includes('function runCompare()')) throw new Error('P6.30 expected runCompare()');
  if (!original.includes('Aucun résultat pour "${q}"')) throw new Error('P6.30 expected raw no-result query sink');
  if (!original.includes('href="${buildSmartUrl(d)}"')) throw new Error('P6.30 expected raw compare href sink');
  const output = html.slice(0, start) + HARDENED_COMPARE + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const blockStart = html.indexOf(START);
  const blockEnd = html.indexOf(END, blockStart + START.length);
  if (blockStart < 0 || blockEnd < 0) throw new Error('P6.30 hardened compare block missing');
  const block = html.slice(blockStart, blockEnd);
  if (!block.includes(`// ${MARKER}`)) throw new Error('P6.30 marker missing');
  if (block.includes('${q}')) throw new Error('P6.30 raw query interpolation remains');
  if (block.includes('href="${buildSmartUrl(d)}"')) throw new Error('P6.30 raw compare href remains');
  for (const required of ['trust.text(', 'trust.html(q)', 'trust.normalizeDeal(', 'trust.httpUrl(buildSmartUrl(deal))']) {
    if (!block.includes(required)) throw new Error(`P6.30 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_30_DYNAMIC_COMPARE_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
