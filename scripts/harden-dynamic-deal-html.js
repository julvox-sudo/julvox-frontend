'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'julvox-p6-28-dynamic-deal-html-trust';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeHttpUrl(value, base = 'https://julvox.com/') {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, base);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function replaceRequired(text, search, replacement, label) {
  const count = text.split(search).length - 1;
  if (count !== 1) {
    throw new Error(`P6.28 expected exactly one ${label}, found ${count}`);
  }
  return text.replace(search, replacement);
}

function transformBlock(text, startMarker, endMarker, label, transform) {
  const start = text.indexOf(startMarker);
  const secondStart = text.indexOf(startMarker, start + 1);
  if (start < 0 || secondStart >= 0) {
    throw new Error(`P6.28 expected exactly one ${label} start marker`);
  }
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`P6.28 could not find ${label} end marker`);
  const block = text.slice(start, end);
  const hardened = transform(block);
  if (hardened === block) throw new Error(`P6.28 ${label} transform made no change`);
  return text.slice(0, start) + hardened + text.slice(end);
}

const RUNTIME = `
<script id="${MARKER}">
(function julvoxDynamicDealHtmlTrust(){
  'use strict';
  function text(value, limit) {
    return String(value == null ? '' : value).replace(/\\s+/g, ' ').trim().slice(0, limit || 1200);
  }
  function html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function httpUrl(value) {
    var raw = text(value, 2000);
    if (!raw) return '';
    try {
      var url = new URL(raw, document.baseURI || window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (url.username || url.password) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }
  function positiveId(value) {
    var id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  }
  function category(value) {
    var slug = text(value, 40).toLowerCase();
    return /^[a-z0-9-]{1,40}$/.test(slug) ? slug : 'default';
  }
  function normalizeDeal(input, requireUrl) {
    if (!input || typeof input !== 'object') return null;
    var name = text(input.name, 300);
    var price = Number(input.current_price != null ? input.current_price : input.price);
    var url = httpUrl(input.affiliate_url || input.url || '');
    if (!name || !Number.isFinite(price) || price <= 0) return null;
    if (requireUrl && !url) return null;

    var output = Object.assign({}, input);
    output.name = name;
    output.store = text(input.store, 160);
    output.brand = text(input.brand, 160);
    output.description = text(input.description, 1200);
    output.category = category(input.category);
    output.current_price = price;
    output.image_url = httpUrl(input.image_url || '');

    if (input.id != null) {
      output.id = positiveId(input.id);
      if (!output.id) return null;
    }
    if (url) {
      if (input.affiliate_url) output.affiliate_url = url;
      else output.url = url;
    }

    var original = Number(input.original_price);
    output.original_price = Number.isFinite(original) && original > 0 ? original : null;
    var discount = Number(input.discount_pct);
    output.discount_pct = Number.isFinite(discount) ? Math.max(0, Math.min(100, discount)) : 0;
    var score = Number(input.novadeal_score);
    output.novadeal_score = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
    return output;
  }
  function findDeal(id) {
    var safeId = positiveId(id);
    if (!safeId || typeof allDeals === 'undefined' || !Array.isArray(allDeals)) return null;
    return allDeals.find(function(deal){ return positiveId(deal && deal.id) === safeId; }) || null;
  }
  function openReportFromDeal(event, id) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    var deal = findDeal(id);
    if (deal && typeof window.openReport === 'function') {
      window.openReport(positiveId(deal.id), text(deal.name, 300));
    }
  }
  function createAlertFromDeal(id) {
    var deal = findDeal(id);
    if (deal && typeof window.createAlert === 'function') {
      window.createAlert(text(deal.name, 300), Number(deal.current_price));
    }
  }
  function openUrl(element) {
    var value = element && element.getAttribute ? element.getAttribute('data-julvox-url') : '';
    var url = httpUrl(value);
    if (!url) {
      if (typeof window.showToast === 'function') window.showToast('Lien indisponible');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    if (typeof window.showToast === 'function') window.showToast('Ouverture en cours...');
  }

  window.JulvoxDynamicDealTrust = Object.freeze({
    category: category,
    createAlertFromDeal: createAlertFromDeal,
    html: html,
    httpUrl: httpUrl,
    normalizeDeal: normalizeDeal,
    openReportFromDeal: openReportFromDeal,
    openUrl: openUrl,
    positiveId: positiveId,
    text: text
  });
})();
</script>`.trim();

const SAFE_SANITIZE_DEALS = `function sanitizeRealDeals(deals) {
  var trust = window.JulvoxDynamicDealTrust;
  return (deals || []).map(function(d){
    return trust.normalizeDeal(d, true);
  }).filter(function(d){
    if (!d) return false;
    var url = d.affiliate_url || d.url || '';
    return !(/\\/s\\?|\\/search|recherche|promotions?$|soldes?$|\\/deals\\/?$/i.test(url));
  });
}

`;

function hardenHtml(input) {
  let html = String(input);
  if (!html.includes('julvox-frontend-reconciliation-01-finalize-runtime')) {
    throw new Error('P6.28 requires the reconciled public artifact first');
  }

  if (html.includes(`id="${MARKER}"`)) {
    assertHardened(html);
    return html;
  }
  html = replaceRequired(html, '</head>', `${RUNTIME}\n</head>`, 'closing head marker');

  html = transformBlock(
    html,
    'function sanitizeRealDeals(deals) {',
    'async function _refreshDealsBackground()',
    'deal ingress normalizer',
    () => SAFE_SANITIZE_DEALS,
  );

  html = transformBlock(
    html,
    'async function openDealOfDay() {',
    'function renderDealOfDay(deal, el) {',
    'deal-of-day loader',
    (block) => replaceRequired(
      block,
      '    const deal = (data.deals || [])[0];',
      '    const deal = window.JulvoxDynamicDealTrust.normalizeDeal((data.deals || [])[0], false);',
      'deal-of-day normalization',
    ),
  );

  html = transformBlock(
    html,
    'function renderDealOfDay(deal, el) {',
    'let favorites = new Set();',
    'deal-of-day renderer',
    (block) => {
      let out = block;
      out = replaceRequired(
        out,
        "  const scoreColor = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--gold)' : '#FF5C2B';",
        "  const scoreColor = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--gold)' : '#FF5C2B';\n  const trust = window.JulvoxDynamicDealTrust;\n  const safeDealId = trust.positiveId(deal.id);\n  const safeName = trust.html(deal.name);\n  const safeStore = trust.html(deal.store);\n  const safeImage = trust.httpUrl(deal.image_url || '');",
        'deal-of-day trusted locals',
      );
      out = replaceRequired(
        out,
        '${(deal.image_url && deal.image_url.startsWith(\'http\'))',
        '${safeImage',
        'deal-of-day raw image predicate',
      );
      out = replaceRequired(
        out,
        '<img src="${deal.image_url}" alt="${deal.name}"',
        '<img src="${trust.html(safeImage)}" alt="${safeName}"',
        'deal-of-day raw image attributes',
      );
      out = replaceRequired(out, '<div class="dotd-title">${deal.name}</div>', '<div class="dotd-title">${safeName}</div>', 'deal-of-day raw name');
      out = replaceRequired(out, '${deal.store}</div>', '${safeStore}</div>', 'deal-of-day raw store');
      out = replaceRequired(
        out,
        'onclick="openDeal(${JSON.stringify(deal).replace(/"/g,\'&quot;\')})"',
        'onclick="openDeal(${safeDealId})"',
        'deal-of-day serialized object handler',
      );
      return out;
    },
  );

  html = transformBlock(
    html,
    'function dealCard(d) {',
    '// ── FLASH ─',
    'deal-card renderer',
    (block) => {
      let out = block;
      out = replaceRequired(out, '  const img    = getProductImage(d);', '  const trust  = window.JulvoxDynamicDealTrust;\n  const safeId = trust.positiveId(d.id);\n  const img    = trust.httpUrl(getProductImage(d));', 'deal-card image normalization');
      out = replaceRequired(out, "  const fallbackImg = getProductImage({category: cat, image_url: ''});", "  const fallbackImg = trust.httpUrl(getProductImage({category: cat, image_url: ''}));", 'deal-card fallback image normalization');
      out = out.split('${d.id}').join('${safeId}');
      out = replaceRequired(
        out,
        "onclick=\"event.stopPropagation();openReport(${safeId},'${escHtml(d.name)}')\"",
        'onclick="window.JulvoxDynamicDealTrust.openReportFromDeal(event,${safeId})"',
        'deal-card report handler',
      );
      return out;
    },
  );

  html = transformBlock(
    html,
    'function renderFlash() {',
    'function startCountdowns() {',
    'legacy flash renderer',
    () => `function renderFlash() {
  const data = (window._liveFlash && window._liveFlash.length > 0)
    ? window._liveFlash
    : ((_FLASH_DB && _FLASH_DB.length) ? _FLASH_DB : FLASH_DEALS);
  renderFlashLive(data || []);
}

`,
  );

  html = transformBlock(
    html,
    'function renderFlashLive(flashDeals) {',
    'function startCountdownsLive(flashDeals) {',
    'live flash renderer',
    (block) => {
      let out = block;
      out = replaceRequired(out, '    const safeImg = escHtml(img);', '    const safeImg = window.JulvoxDynamicDealTrust.html(window.JulvoxDynamicDealTrust.httpUrl(img));', 'live flash image URL');
      out = replaceRequired(out, 'escHtml(rawUrl)', 'window.JulvoxDynamicDealTrust.html(window.JulvoxDynamicDealTrust.httpUrl(rawUrl))', 'live flash data URL');
      out = replaceRequired(
        out,
        "      var url = this.getAttribute('data-url');\n      if (url && url.startsWith('http')) {\n        window.open(url, '_blank', 'noopener,noreferrer');",
        "      var url = window.JulvoxDynamicDealTrust.httpUrl(this.getAttribute('data-url'));\n      if (url) {\n        window.open(url, '_blank', 'noopener,noreferrer');",
        'live flash click URL verification',
      );
      return out;
    },
  );

  html = transformBlock(
    html,
    'async function openDeal(id) {',
    'async function _enrichDealModal(deal) {',
    'deal modal renderer',
    (block) => {
      let out = block;
      out = replaceRequired(out, '  const img   = getProductImage(deal);', '  const img   = window.JulvoxDynamicDealTrust.httpUrl(getProductImage(deal));', 'modal image URL');
      out = replaceRequired(out, "  const fallbackImg = getProductImage({category: cat, image_url: ''});", "  const fallbackImg = window.JulvoxDynamicDealTrust.httpUrl(getProductImage({category: cat, image_url: ''}));", 'modal fallback image URL');
      out = replaceRequired(
        out,
        'var u=buildSmartUrl(deal); return u && u!==\'#\' ? `<a class="cta-main" href="${u}" target="_blank" rel="noopener" onclick="showToast(\'✅ Ouverture de ${escHtml(deal.store)}...\')">',
        'var u=window.JulvoxDynamicDealTrust.httpUrl(buildSmartUrl(deal)); return u ? `<a class="cta-main" href="${window.JulvoxDynamicDealTrust.html(u)}" target="_blank" rel="noopener" onclick="showToast(\'✅ Ouverture en cours...\')">',
        'modal CTA URL and handler',
      );
      out = replaceRequired(
        out,
        '<button class="cta-sec" onclick="createAlert(\'${escHtml(deal.name)}\',${deal.current_price})">',
        '<button class="cta-sec" onclick="window.JulvoxDynamicDealTrust.createAlertFromDeal(${window.JulvoxDynamicDealTrust.positiveId(deal.id)})">',
        'modal create-alert handler',
      );
      return out;
    },
  );

  html = transformBlock(
    html,
    'async function _enrichDealModal(deal) {',
    'function closeModal(e) {',
    'deal analysis renderer',
    (block) => {
      let out = block;
      out = replaceRequired(
        out,
        ".map(r => '<div style=\"font-size:11px;color:var(--txt2);margin-bottom:3px\">→ ' + r + '</div>')",
        ".map(r => '<div style=\"font-size:11px;color:var(--txt2);margin-bottom:3px\">→ ' + window.JulvoxDynamicDealTrust.html(r) + '</div>')",
        'analysis reason escaping',
      );
      out = replaceRequired(
        out,
        "+ (rarity.label || '') + '</div>';",
        "+ window.JulvoxDynamicDealTrust.html(rarity.label || '') + '</div>';",
        'analysis rarity escaping',
      );
      out = replaceRequired(
        out,
        "+ '<div style=\"font-size:12px;font-weight:700;margin-bottom:4px\">' + (a.title || '') + '</div>'",
        "+ '<div style=\"font-size:12px;font-weight:700;margin-bottom:4px\">' + window.JulvoxDynamicDealTrust.html(a.title || '') + '</div>'",
        'analysis alert title escaping',
      );
      out = replaceRequired(
        out,
        "+ '<div style=\"font-size:11px;color:var(--txt2)\">' + (a.message || '') + '</div></div>'",
        "+ '<div style=\"font-size:11px;color:var(--txt2)\">' + window.JulvoxDynamicDealTrust.html(a.message || '') + '</div></div>'",
        'analysis alert message escaping',
      );
      return out;
    },
  );

  const forbidden = [
    'onclick="openDeal(${JSON.stringify(deal)',
    "openReport(${safeId},'${escHtml(d.name)}')",
    "createAlert('${escHtml(deal.name)}'",
    "+ (rarity.label || '') + '</div>';",
    "+ (a.title || '') + '</div>'",
    "+ (a.message || '') + '</div></div>'",
  ];
  for (const marker of forbidden) {
    if (html.includes(marker)) throw new Error(`P6.28 unsafe dynamic deal sink remains: ${marker}`);
  }
  if (!html.includes(`id="${MARKER}"`)) throw new Error('P6.28 runtime marker missing');
  return html;
}

function assertHardened(html) {
  const text = String(html);
  const markers = text.match(new RegExp(`id=["']${MARKER}["']`, 'g')) || [];
  if (markers.length !== 1) throw new Error(`P6.28 marker count must be 1, got ${markers.length}`);
  if (!text.includes('window.JulvoxDynamicDealTrust.openReportFromDeal')) throw new Error('P6.28 report handler authority missing');
  if (!text.includes('window.JulvoxDynamicDealTrust.createAlertFromDeal')) throw new Error('P6.28 alert handler authority missing');
  if (!text.includes('window.JulvoxDynamicDealTrust.normalizeDeal')) throw new Error('P6.28 deal normalization authority missing');
}

function hardenPublicArtifact() {
  const file = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(file)) throw new Error('P6.28 dist/index.html is missing');
  const source = fs.readFileSync(file, 'utf8');
  const hardened = hardenHtml(source);
  assertHardened(hardened);
  fs.writeFileSync(file, hardened, 'utf8');
  console.log('P6_28_DYNAMIC_DEAL_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  RUNTIME,
  assertHardened,
  escapeHtml,
  hardenHtml,
  hardenPublicArtifact,
  normalizeHttpUrl,
};
