'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MARKER,
  escapeHtml,
  hardenHtml,
  normalizeHttpUrl,
} = require('../../scripts/harden-dynamic-deal-html');

test('P6.28 escapes adversarial deal text as inert HTML text', () => {
  const payload = `<img src=x onerror="globalThis.pwned=1">'&`;
  const escaped = escapeHtml(payload);
  assert.equal(escaped.includes('<img'), false);
  assert.match(escaped, /&lt;img/);
  assert.match(escaped, /&quot;/);
  assert.match(escaped, /&#039;/);
  assert.match(escaped, /&amp;/);
});

test('P6.28 accepts only credential-free HTTP(S) URLs', () => {
  assert.equal(normalizeHttpUrl('javascript:alert(1)'), '');
  assert.equal(normalizeHttpUrl('data:text/html,<svg onload=alert(1)>'), '');
  assert.equal(normalizeHttpUrl('https://user:pass@example.test/item'), '');
  assert.equal(normalizeHttpUrl('not a url', 'not a base'), '');
  assert.equal(
    normalizeHttpUrl('https://example.test/a b?q="x"'),
    'https://example.test/a%20b?q=%22x%22',
  );
});

function fixture() {
  return `<!doctype html>
<html><head></head><body>
<div>julvox-frontend-reconciliation-01-finalize-runtime</div>
<script>
async function openDealOfDay() {
    const deal = (data.deals || [])[0];
}
function renderDealOfDay(deal, el) {
  const discount = deal.discount_pct ? Math.round(deal.discount_pct) : 0;
  const scoreColor = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--gold)' : '#FF5C2B';
  el.innerHTML = \`\${(deal.image_url && deal.image_url.startsWith('http'))
    ? \`<img src="\${deal.image_url}" alt="\${deal.name}" style="x">\`
    : getCatEmoji(deal.category)}
    <div class="dotd-title">\${deal.name}</div>
    <div class="store">\${deal.store}</div>
    <button onclick="openDeal(\${JSON.stringify(deal).replace(/"/g,'&quot;')})">go</button>\`;
}
let favorites = new Set();

function sanitizeRealDeals(deals) {
  return deals;
}

async function _refreshDealsBackground() {}

function renderFlashLive(flashDeals) {
  return flashDeals.map(function(f) {
    const img = f.image_url || '';
    const rawUrl = f.affiliate_url || f.url || '';
    const safeImg = escHtml(img);
    return '<div class="flash-card" data-url="' + escHtml(rawUrl) + '"><img src="' + safeImg + '"></div>';
  }).join('');
}
function clickFlash(card) {
      var url = this.getAttribute('data-url');
      if (url && url.startsWith('http')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
}
function startCountdownsLive(flashDeals) {}

function dealCard(d) {
  const img    = getProductImage(d);
  const trust = ui00ResolveScore(STORE_TRUST[d.store]);
  const fallbackImg = getProductImage({category: cat, image_url: ''});
  return \`<div onclick="openDeal(\${d.id})"><button onclick="event.stopPropagation();openReport(\${d.id},'\${escHtml(d.name)}')">report</button></div>\`;
}

// ── FLASH ─
function renderFlash() {
  const url = 'x';
  return \`<div onclick="\${url}"></div>\`;
}
function startCountdowns() {}

async function openDeal(id) {
  const img   = getProductImage(deal);
  const fallbackImg = getProductImage({category: cat, image_url: ''});
  const cta = \`\${(function(){ var u=buildSmartUrl(deal); return u && u!=='#' ? \`<a class="cta-main" href="\${u}" target="_blank" rel="noopener" onclick="showToast('✅ Ouverture de \${escHtml(deal.store)}...')">go</a>\` : '<div>no</div>'; })()}
    <button class="cta-sec" onclick="createAlert('\${escHtml(deal.name)}',\${deal.current_price})">alert</button>\`;
}
async function _enrichDealModal(deal) {
  const reasons = (fake.reasons || []).slice(0, 2)
        .map(r => '<div style="font-size:11px;color:var(--txt2);margin-bottom:3px">→ ' + r + '</div>')
        .join('');
  let html = '';
  html += '<div>' + (rarity.label || '') + '</div>';
  html += alerts.map(a =>
        '<div>'
        + '<div style="font-size:12px;font-weight:700;margin-bottom:4px">' + (a.title || '') + '</div>'
        + '<div style="font-size:11px;color:var(--txt2)">' + (a.message || '') + '</div></div>'
      ).join('');
}
function closeModal(e) {}
</script>
</body></html>`;
}

test('P6.28 rewrites dynamic deal HTML boundaries and is idempotent', () => {
  const hardened = hardenHtml(fixture());
  assert.equal((hardened.match(new RegExp(MARKER, 'g')) || []).length >= 1, true);
  assert.match(hardened, /JulvoxDynamicDealTrust\.normalizeDeal/);
  assert.match(hardened, /JulvoxDynamicDealTrust\.openReportFromDeal/);
  assert.match(hardened, /JulvoxDynamicDealTrust\.createAlertFromDeal/);
  assert.doesNotMatch(hardened, /JSON\.stringify\(deal\)\.replace/);
  assert.doesNotMatch(hardened, /createAlert\('\$\{escHtml\(deal\.name\)\}/);
  assert.doesNotMatch(hardened, /\+ \(a\.message \|\| ''\) \+/);

  const scripts = [...hardened.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  scripts.forEach((source, index) => assert.doesNotThrow(
    () => new vm.Script(source, { filename: `fixture-inline-${index}.js` }),
  ));

  assert.equal(hardenHtml(hardened), hardened);
});

test('P6.28 runs immediately before CSP hashes the final public artifact', () => {
  const cspSource = fs.readFileSync(
    path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'),
    'utf8',
  );
  assert.match(cspSource, /require\('\.\/harden-dynamic-deal-html'\)/);
  const dynamicCall = cspSource.indexOf('hardenDynamicDealHtml();');
  const indexRead = cspSource.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(dynamicCall >= 0);
  assert.ok(indexRead > dynamicCall);
});
