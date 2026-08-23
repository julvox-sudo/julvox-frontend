'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = 'function renderBudgetResults(data, el) {';
const END = '// ── WISHLIST ──────────────────────────────────────────────────';
const MARKER = 'P6_33_BUDGET_DEAL_HTML_TRUST';

const HARDENED = `// ${MARKER}
function renderBudgetResults(data, el) {
  const trust = window.JulvoxDynamicDealTrust;
  if (!el || !trust) return;
  const payload = data && typeof data === 'object' ? data : {};
  const deals = (Array.isArray(payload.deals) ? payload.deals : []).map(function(deal) {
    return trust.normalizeDeal(deal, false);
  }).filter(Boolean);

  if (!deals.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3)">Aucun deal trouvé dans ce budget</div>';
    return;
  }

  const finite = function(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : (fallback || 0);
  };
  const totalPrice = Math.max(0, finite(payload.total_price, 0));
  const budget = Math.max(0, finite(payload.budget, 0));
  const totalSaved = Math.max(0, finite(payload.total_saved, 0));
  const efficiency = Math.max(0, Math.min(100, finite(payload.efficiency, 0)));
  const remaining = Math.max(0, finite(payload.remaining, 0));

  el.innerHTML = \`
    <div class="budget-result-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:4px">TOTAL SÉLECTIONNÉ</div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800">\${totalPrice.toFixed(2)}€ <span style="font-size:14px;color:rgba(255,255,255,.5)">/ \${budget.toFixed(2)}€</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:rgba(255,255,255,.6)">ÉCONOMIES</div>
          <div class="budget-saved">+\${totalSaved.toFixed(2)}€</div>
        </div>
      </div>
      <div class="budget-efficiency">⚡ Efficacité : \${Math.round(efficiency)}% — \${deals.length} deals</div>
      \${remaining > 0 ? \`<div style="font-size:12px;color:rgba(255,255,255,.5);margin-top:8px">Reste : \${remaining.toFixed(2)}€</div>\` : ''}
    </div>
    \${deals.map(function(deal, index) {
      const imageUrl = trust.httpUrl(deal.image_url || '');
      const image = imageUrl
        ? \`<img class="budget-deal-image" src="\${trust.html(imageUrl)}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:8px"/>\`
        : trust.html(getCatEmoji(deal.category));
      const score = ui00NumericScore(deal.novadeal_score);
      const discount = finite(deal.discount_pct, 0);
      return \`
      <div data-budget-deal-index="\${index}" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:var(--trans)">
        <div style="font-size:28px">\${image}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;line-height:1.2">\${trust.html(deal.name)}</div>
          <div style="font-size:11px;color:var(--txt3);margin-top:2px">\${trust.html(deal.store)} · \${score === null ? 'Score indisponible' : '★ ' + score}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--accent)">\${formatPrice(finite(deal.current_price, 0))}</div>
          \${discount > 0 ? \`<div style="font-size:11px;color:var(--green)">-\${Math.round(Math.min(100, discount))}%</div>\` : ''}
        </div>
      </div>\`;
    }).join('')}
  \`;

  el.querySelectorAll('[data-budget-deal-index]').forEach(function(row) {
    row.addEventListener('click', function() {
      const index = Number(row.getAttribute('data-budget-deal-index'));
      const deal = Number.isSafeInteger(index) ? deals[index] : null;
      if (deal) openDeal(deal);
    });
  });
  el.querySelectorAll('.budget-deal-image').forEach(function(image) {
    image.addEventListener('error', function(){ image.style.display = 'none'; }, { once: true });
  });
}

`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) return html;
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.33 budget hardening could not locate canonical block');
  }
  const original = html.slice(start, end);
  for (const sink of [
    `onclick="openDeal(\${JSON.stringify(d).replace(/"/g,'&quot;')})"`,
    '${d.name}',
    '${d.store}',
    'src="${d.image_url}"',
  ]) {
    if (!original.includes(sink)) throw new Error(`P6.33 expected budget sink missing: ${sink}`);
  }
  const output = html.slice(0, start) + HARDENED + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error('P6.33 hardened budget block missing');
  const block = html.slice(start, end);
  for (const bad of [
    'JSON.stringify(d).replace',
    '${d.name}',
    '${d.store}',
    'src="${d.image_url}"',
    'onclick="openDeal(',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.33 budget sink remains: ${bad}`);
  }
  for (const required of [
    'trust.normalizeDeal(deal, false)',
    "trust.httpUrl(deal.image_url || '')",
    'trust.html(deal.name)',
    'trust.html(deal.store)',
    "row.addEventListener('click'",
    'Number.isSafeInteger(index)',
  ]) {
    if (!block.includes(required)) throw new Error(`P6.33 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_33_BUDGET_DEAL_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
