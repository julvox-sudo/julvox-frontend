'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LOAD_START = 'async function loadCommDeals(sort, el) {';
const LOAD_END = 'async function loadCommLeader(el) {';
const RENDER_START = 'function renderCommDeals(deals, el, sort) {';
const RENDER_END = '// ── Vote on a community deal ──';
const MARKER = 'P6_35_COMMUNITY_CLAIM_CONTRACT_DOM_TRUST';

const HARDENED_LOAD = `// ${MARKER}
function communityClaimPayloadList(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.claims)) return data.claims;
  if (Array.isArray(data.deals)) return data.deals;
  return [];
}

function normalizeCommunityClaim(input) {
  const trust = window.JulvoxDynamicDealTrust;
  if (!trust || !input || typeof input !== 'object') return null;
  const id = trust.positiveId(input.id);
  const productName = trust.text(input.product_name || input.name || input.description, 300);
  if (!id || !productName) return null;
  const finitePositive = function(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const count = function(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? Math.min(number, 1000000000) : 0;
  };
  const rawStatus = trust.text(input.moderation_status || input.status, 32).toLowerCase();
  const status = ['pending', 'approved', 'rejected'].includes(rawStatus) ? rawStatus : 'pending';
  const rawMarketStatus = trust.text(input.market_fact_status, 64);
  return {
    id,
    author_name: trust.text(input.author_name, 160) || 'Communauté',
    product_name: productName,
    url: trust.httpUrl(input.url || ''),
    price: finitePositive(input.claimed_price != null ? input.claimed_price : (input.price != null ? input.price : input.current_price)),
    original_price: finitePositive(input.claimed_original_price != null ? input.claimed_original_price : input.original_price),
    store: trust.text(input.claimed_store != null ? input.claimed_store : input.store, 160),
    category: trust.text(input.category, 80),
    description: trust.text(input.description, 1200),
    status,
    votes_validate: count(input.votes_validate),
    votes_doubt: count(input.votes_doubt),
    votes_expired: count(input.votes_expired),
    comments_count: count(input.comments_count),
    market_fact_status: rawMarketStatus || (Object.prototype.hasOwnProperty.call(input, 'claimed_price') ? 'community_claim_unverified' : ''),
    score: Number.isFinite(Number(input.score)) ? Math.max(0, Math.min(100, Number(input.score))) : null,
  };
}

function normalizeCommunityClaims(data) {
  return communityClaimPayloadList(data).map(normalizeCommunityClaim).filter(Boolean);
}

async function loadCommDeals(sort, el) {
  if (!el) return;
  el.textContent = 'Chargement…';
  const selectedSort = typeof sort === 'string' && sort ? sort : 'recent';
  const result = await window.JULVOX_API.get('/community/deals?status=approved&sort=' + encodeURIComponent(selectedSort) + '&limit=20', {
    isEmpty: data => communityClaimPayloadList(data).length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Deals communautaires indisponibles.', () => loadCommDeals(selectedSort, el)); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucun deal communautaire confirmé.', () => loadCommDeals(selectedSort, el)); return; }
  const claims = normalizeCommunityClaims(result.data);
  if (!claims.length) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucun deal communautaire exploitable.', () => loadCommDeals(selectedSort, el)); return; }
  renderCommDeals(claims, el, selectedSort);
}

async function loadMyCommDeals(el) {
  if (!currentUser) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Connecte-toi pour voir tes soumissions.', null); return; }
  el.textContent = 'Chargement…';
  const result = await window.JULVOX_API.get('/community/my-deals', {
    token: currentUser.token,
    isEmpty: data => communityClaimPayloadList(data).length === 0,
  });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'error', 'Soumissions indisponibles.', () => loadMyCommDeals(el)); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucune soumission confirmée.', () => loadMyCommDeals(el)); return; }
  const claims = normalizeCommunityClaims(result.data);
  if (!claims.length) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Aucune soumission exploitable.', () => loadMyCommDeals(el)); return; }
  renderCommDeals(claims, el, 'mine');
}

`;

const HARDENED_RENDER = `function renderCommDeals(deals, el, sort) {
  const trust = window.JulvoxDynamicDealTrust;
  if (!el || !trust) return;
  const normalized = (Array.isArray(deals) ? deals : []).map(normalizeCommunityClaim).filter(Boolean);
  if (!normalized.length) {
    el.innerHTML = \`<div style="text-align:center;padding:24px;color:var(--txt3)">Aucun deal pour l'instant.<br>Sois le premier à en soumettre !</div>\`;
    return;
  }
  el.innerHTML = normalized.map(function(deal) { return renderCommDealCard(deal); }).join('');

  el.querySelectorAll('[data-comm-vote-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      const id = trust.positiveId(button.getAttribute('data-comm-vote-id'));
      const type = button.getAttribute('data-comm-vote-type');
      if (id && ['validate', 'doubt', 'expired'].includes(type)) voteCommDeal(id, type, button);
    });
  });
  el.querySelectorAll('[data-comm-comments-id]').forEach(function(button) {
    button.addEventListener('click', function() {
      const id = trust.positiveId(button.getAttribute('data-comm-comments-id'));
      const deal = normalized.find(function(item) { return item.id === id; });
      if (deal) openCommComments(id, deal.product_name);
    });
  });
}

function renderCommDealCard(d) {
  const trust = window.JulvoxDynamicDealTrust;
  if (!trust) return '';
  const pct = d.original_price && d.price ? Math.max(0, Math.min(100, Math.round((1 - d.price / d.original_price) * 100))) : 0;
  const score = Number.isFinite(d.score) ? d.score : null;
  const scoreClass = score !== null ? (score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low') : 'mid';
  const scoreEmoji = score !== null ? (score >= 75 ? '🏆' : score >= 50 ? '✓' : '~') : '👥';
  const status = d.status;
  const votedType = _commVotes[d.id] || '';
  const totalVotes = d.votes_validate + d.votes_doubt + d.votes_expired;
  const trustPct = totalVotes > 0 ? Math.round((d.votes_validate / totalVotes) * 100) : null;
  const scoreLabel = score !== null && d.market_fact_status !== 'community_claim_unverified'
    ? \`\${scoreEmoji} Julvox \${score}\`
    : '👥 Déclaration communautaire · non vérifiée';

  return \`
  <div class="comm-deal-card" id="commCard_\${d.id}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;margin-bottom:3px;line-height:1.3">\${trust.html(d.product_name)}</div>
        <div style="font-size:12px;color:var(--txt3)">\${trust.html(d.store)}\${d.category ? ' · ' + trust.html(d.category) : ''}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:3px">👤 \${trust.html(d.author_name)}</div>
        \${d.description && d.description !== d.product_name ? \`<div style="font-size:12px;color:var(--txt2);margin-top:4px;line-height:1.4">\${trust.html(d.description)}</div>\` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">\${d.price !== null ? formatPrice(d.price) : '—'}</div>
        \${d.original_price !== null ? \`<div style="font-size:11px;color:var(--txt3);text-decoration:line-through">\${formatPrice(d.original_price)}</div>\` : ''}
        \${pct > 0 ? \`<span class="comm-pct-badge">−\${pct}%</span>\` : ''}
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span class="comm-score-pill \${scoreClass}">\${scoreLabel}</span>
      \${trustPct !== null ? \`<span style="font-size:11px;color:var(--txt3)">\${trustPct}% de confiance communauté (\${totalVotes} votes)</span>\` : ''}
      \${status === 'pending' ? \`<span style="font-size:11px;color:var(--gold);margin-left:auto">⏳ En attente</span>\` : ''}
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <button type="button" class="comm-vote-btn validate \${votedType==='validate'?'voted':''}" data-comm-vote-id="\${d.id}" data-comm-vote-type="validate">✅ Deal valide · \${d.votes_validate}</button>
      <button type="button" class="comm-vote-btn doubt \${votedType==='doubt'?'voted':''}" data-comm-vote-id="\${d.id}" data-comm-vote-type="doubt">⚠️ Prix douteux · \${d.votes_doubt}</button>
      <button type="button" class="comm-vote-btn expired \${votedType==='expired'?'voted':''}" data-comm-vote-id="\${d.id}" data-comm-vote-type="expired">⏰ Expiré · \${d.votes_expired}</button>
    </div>

    <div style="display:flex;gap:8px">
      \${d.url ? \`<a href="\${trust.html(d.url)}" target="_blank" rel="noopener noreferrer" style="flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--a2));color:#fff;border:none;border-radius:10px;padding:9px;font-size:12px;font-weight:700;text-decoration:none">🛒 Voir l'offre →</a>\` : ''}
      <button type="button" data-comm-comments-id="\${d.id}" style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;color:var(--txt)">💬 Commenter \${d.comments_count ? \`(\${d.comments_count})\` : ''}</button>
    </div>
  </div>\`;
}

`;

function replaceBlock(html, startMarker, endMarker, replacement, label) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`P6.35 community hardening could not locate ${label} block`);
  }
  return html.slice(0, start) + replacement + html.slice(end);
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }
  const loadStart = html.indexOf(LOAD_START);
  const loadEnd = html.indexOf(LOAD_END, loadStart + LOAD_START.length);
  if (loadStart < 0 || loadEnd < 0) throw new Error('P6.35 community load anchors missing');
  const originalLoad = html.slice(loadStart, loadEnd);
  for (const expected of ['data?.deals', 'result.data.deals']) {
    if (!originalLoad.includes(expected)) throw new Error(`P6.35 expected legacy community contract sink missing: ${expected}`);
  }

  const renderStart = html.indexOf(RENDER_START);
  const renderEnd = html.indexOf(RENDER_END, renderStart + RENDER_START.length);
  if (renderStart < 0 || renderEnd < 0) throw new Error('P6.35 community render anchors missing');
  const originalRender = html.slice(renderStart, renderEnd);
  for (const expected of [
    "onclick=\"voteCommDeal(${d.id},'validate',this)\"",
    "onclick=\"openCommComments(${d.id},'${escHtml(d.product_name||'Deal')}')\"",
  ]) {
    if (!originalRender.includes(expected)) throw new Error(`P6.35 expected community DOM sink missing: ${expected}`);
  }

  let output = replaceBlock(html, LOAD_START, LOAD_END, HARDENED_LOAD, 'load');
  output = replaceBlock(output, RENDER_START, RENDER_END, HARDENED_RENDER, 'render');
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.35 marker count must be 1, got ${markerCount}`);
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(RENDER_END, start);
  if (start < 0 || end < 0) throw new Error('P6.35 hardened community block missing');
  const block = html.slice(start, end);
  for (const bad of [
    'data?.deals',
    'result.data.deals',
    'onclick="voteCommDeal(${d.id}',
    'onclick="openCommComments(${d.id}',
    "'${escHtml(d.product_name||'Deal')}'",
  ]) {
    if (block.includes(bad)) throw new Error(`P6.35 community sink remains: ${bad}`);
  }
  for (const required of [
    'Array.isArray(data.claims)',
    'input.claimed_price',
    'input.claimed_store',
    'input.moderation_status',
    "market_fact_status: rawMarketStatus",
    'data-comm-vote-id',
    'data-comm-comments-id',
    "button.addEventListener('click'",
    "trust.httpUrl(input.url || '')",
    "trust.html(d.product_name)",
    'Déclaration communautaire · non vérifiée',
  ]) {
    if (!block.includes(required)) throw new Error(`P6.35 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_35_COMMUNITY_CLAIM_CONTRACT_DOM_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
