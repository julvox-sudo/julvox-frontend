'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'julvox-p6-29-dynamic-promo-html-trust';

function replaceRequired(text, search, replacement, label) {
  const count = text.split(search).length - 1;
  if (count !== 1) throw new Error(`P6.29 expected exactly one ${label}, found ${count}`);
  return text.replace(search, replacement);
}

function transformBlock(text, startMarker, endMarker, label, transform) {
  const start = text.indexOf(startMarker);
  const secondStart = text.indexOf(startMarker, start + 1);
  if (start < 0 || secondStart >= 0) throw new Error(`P6.29 expected exactly one ${label} start marker`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`P6.29 could not find ${label} end marker`);
  const block = text.slice(start, end);
  const hardened = transform(block);
  if (hardened === block) throw new Error(`P6.29 ${label} transform made no change`);
  return text.slice(0, start) + hardened + text.slice(end);
}

const RUNTIME = `
<script id="${MARKER}">
(function julvoxDynamicPromoHtmlTrust(){
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
  function positiveId(value) {
    var id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  }
  function count(value) {
    var n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000000) : 0;
  }
  function slug(value) {
    var raw = text(value, 40).toLowerCase();
    return /^[a-z0-9-]{1,40}$/.test(raw) ? raw : '';
  }
  function normalizePromo(input, sourceFallback) {
    if (!input || typeof input !== 'object') return null;
    var id = positiveId(input.id);
    var store = text(input.store, 160);
    var code = text(input.code, 120);
    if (!id || !store || !code) return null;
    var output = Object.assign({}, input);
    output.id = id;
    output.store = store;
    output.code = code;
    output.description = text(input.description, 1200);
    output.desc = text(input.desc, 1200);
    output.discount = text(input.discount, 160);
    output.discount_desc = text(input.discount_desc, 160);
    output.emoji = text(input.emoji, 24);
    output.author_name = text(input.author_name, 160);
    output.expiry = text(input.expiry, 80);
    output.expiry_date = text(input.expiry_date, 80);
    output.cat = slug(input.cat);
    output.category = slug(input.category);
    output.votes_ok = count(input.votes_ok);
    output.votes_ko = count(input.votes_ko);
    output.user_vote = input.user_vote === 'ok' || input.user_vote === 'ko' ? input.user_vote : null;
    output.source = input.source === 'verified' || sourceFallback === 'verified' ? 'verified' : 'community';
    output.is_verified = input.is_verified === true;
    output.submitted_by = text(input.submitted_by, 200);
    return output;
  }
  function normalizeList(list, sourceFallback) {
    return (Array.isArray(list) ? list : []).map(function(item){
      return normalizePromo(item, sourceFallback);
    }).filter(Boolean);
  }
  function findPromo(id) {
    var safeId = positiveId(id);
    if (!safeId || typeof _allPromos === 'undefined' || !Array.isArray(_allPromos)) return null;
    return _allPromos.find(function(promo){ return positiveId(promo && promo.id) === safeId; }) || null;
  }
  function copyById(id, button) {
    var promo = findPromo(id);
    if (promo && typeof window.copyPromo === 'function') window.copyPromo(promo.code, button);
  }
  function shareById(id) {
    var promo = findPromo(id);
    if (promo && typeof window.sharePromo === 'function') window.sharePromo(promo.code, promo.store);
  }
  window.JulvoxDynamicPromoTrust = Object.freeze({
    copyById: copyById,
    count: count,
    html: html,
    normalizeList: normalizeList,
    normalizePromo: normalizePromo,
    positiveId: positiveId,
    shareById: shareById,
    text: text
  });
})();
</script>`.trim();

function hardenHtml(input) {
  let html = String(input);
  if (!html.includes('julvox-p6-28-dynamic-deal-html-trust')) {
    throw new Error('P6.29 requires the P6.28 public artifact first');
  }
  if (html.includes(`id="${MARKER}"`)) {
    assertHardened(html);
    return html;
  }

  html = replaceRequired(html, '</head>', `${RUNTIME}\n</head>`, 'closing head marker');
  html = replaceRequired(
    html,
    'let _allPromos      = [..._STATIC_PROMOS];',
    'let _allPromos      = window.JulvoxDynamicPromoTrust.normalizeList(_STATIC_PROMOS);',
    'initial promo normalization',
  );

  html = transformBlock(html, 'async function loadAndRenderPromos() {', 'function renderPromoStats() {', 'promo loader', block => {
    let out = block;
    out = replaceRequired(out, "  const grid = document.getElementById('promoGrid');", "  const grid = document.getElementById('promoGrid');\n  const promoTrust = window.JulvoxDynamicPromoTrust;", 'promo loader trust local');
    out = replaceRequired(out, "      const community = (d.codes || []).map(p => ({...p, source: p.source || 'community'}));", "      const community = promoTrust.normalizeList(d.codes || [], 'community');", 'promo API normalization');
    out = replaceRequired(out, '      _allPromos = community.length ? community : [..._STATIC_PROMOS];', '      _allPromos = community.length ? community : promoTrust.normalizeList(_STATIC_PROMOS);', 'promo static fallback normalization');
    out = replaceRequired(out, '  } catch(e) { _allPromos = [..._STATIC_PROMOS]; }', '  } catch(e) { _allPromos = promoTrust.normalizeList(_STATIC_PROMOS); }', 'promo catch fallback normalization');
    return out;
  });

  html = transformBlock(html, 'function renderPromoCard(p) {', 'function filterPromos(text) {', 'promo card renderer', block => {
    let out = block;
    out = replaceRequired(
      out,
      'function renderPromoCard(p) {\n  const total      = (p.votes_ok||0) + (p.votes_ko||0);',
      "function renderPromoCard(p) {\n  const promoTrust = window.JulvoxDynamicPromoTrust;\n  p = promoTrust.normalizePromo(p);\n  if (!p) return '';\n  const safeId = p.id;\n  const total      = p.votes_ok + p.votes_ko;",
      'promo card normalized entry',
    );
    out = replaceRequired(out, '  const pct        = total > 0 ? Math.round((p.votes_ok||0) / total * 100) : null;', '  const pct        = total > 0 ? Math.round(p.votes_ok / total * 100) : null;', 'promo numeric percent');
    out = replaceRequired(out, '  const voted      = _promoVotes[p.id] || p.user_vote;', '  const voted      = _promoVotes[safeId] || p.user_vote;', 'promo vote lookup ID');
    out = replaceRequired(out, '  const storeEmoji = p.emoji || getStoreEmoji(p.store);', '  const safeStoreEmoji = promoTrust.html(p.emoji || getStoreEmoji(p.store));', 'promo emoji escaping');
    out = replaceRequired(out, '${storeEmoji}</span>', '${safeStoreEmoji}</span>', 'promo emoji output');
    out = replaceRequired(out, '<button class="promo-copy" onclick="copyPromo(\'${escHtml(p.code)}\',this)">Copier</button>', '<button class="promo-copy" onclick="window.JulvoxDynamicPromoTrust.copyById(${safeId},this)">Copier</button>', 'promo copy handler');
    out = replaceRequired(out, '<button onclick="sharePromo(\'${escHtml(p.code)}\',\'${escHtml(p.store)}\')"', '<button onclick="window.JulvoxDynamicPromoTrust.shareById(${safeId})"', 'promo share handler');
    out = out.split('votePromo(${p.id},').join('votePromo(${safeId},');
    out = out.split('${p.votes_ok||0}').join('${p.votes_ok}');
    out = out.split('${p.votes_ko||0}').join('${p.votes_ko}');
    return out;
  });

  const forbidden = [
    "copyPromo('${escHtml(p.code)}'",
    "sharePromo('${escHtml(p.code)}'",
    'votePromo(${p.id},',
    '${storeEmoji}</span>',
  ];
  for (const marker of forbidden) {
    if (html.includes(marker)) throw new Error(`P6.29 unsafe dynamic promo sink remains: ${marker}`);
  }
  assertHardened(html);
  return html;
}

function assertHardened(html) {
  const text = String(html);
  const markers = text.match(new RegExp(`id=["']${MARKER}["']`, 'g')) || [];
  if (markers.length !== 1) throw new Error(`P6.29 marker count must be 1, got ${markers.length}`);
  for (const authority of ['normalizeList', 'copyById', 'shareById']) {
    if (!text.includes(`JulvoxDynamicPromoTrust.${authority}`)) throw new Error(`P6.29 ${authority} authority missing`);
  }
}

function hardenPublicArtifact() {
  const file = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(file)) throw new Error('P6.29 dist/index.html is missing');
  const source = fs.readFileSync(file, 'utf8');
  const hardened = hardenHtml(source);
  assertHardened(hardened);
  fs.writeFileSync(file, hardened, 'utf8');
  console.log('P6_29_DYNAMIC_PROMO_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, RUNTIME, assertHardened, hardenHtml, hardenPublicArtifact };
