'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = 'function renderActiveSquad(data) {';
const END = 'function copyToClipboard(text) {';
const MARKER = 'P6_37_DEAL_SQUAD_DOM_TRUST';

function injectedDealSquadRuntime() {
  // P6_37_DEAL_SQUAD_DOM_TRUST
  function normalizeDealSquadView(input) {
    const trust = window.JulvoxDynamicDealTrust;
    if (!trust || !input || typeof input !== 'object') return null;
    const text = function(value, limit) { return trust.text(value, limit); };
    const integer = function(value, fallback, min, max) {
      const n = Number(value);
      if (!Number.isSafeInteger(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    const productName = text(input.product_name, 200) || 'Produit';
    const rawSquadId = text(input.squad_id, 32).toUpperCase();
    const squadId = /^[A-Z0-9_-]{1,32}$/.test(rawSquadId) ? rawSquadId : '';
    const targetCount = integer(input.target_count, 10, 2, 1000);
    const currentCount = integer(input.current_count != null ? input.current_count : input.members, 1, 0, targetCount);
    const shareUrl = trust.httpUrl(input.share_url || '') || 'https://julvox.com/';
    return { productName, squadId, targetCount, currentCount, shareUrl };
  }

  function renderActiveSquad(data) {
    const trust = window.JulvoxDynamicDealTrust;
    const squad = normalizeDealSquadView(data);
    const form = document.getElementById('createSquadForm');
    const section = document.getElementById('activeSquadSection');
    const card = document.getElementById('activeSquadCard');
    if (!trust || !squad || !card) return;
    if (form) form.style.display = 'none';
    if (section) section.style.display = '';

    const pct = Math.max(0, Math.min(100, Math.round((squad.currentCount || 0) / squad.targetCount * 100)));
    const remaining = Math.max(0, squad.targetCount - squad.currentCount);
    card.innerHTML = `
      <div style="background:var(--bg2);border:1px solid rgba(255,92,43,.3);border-radius:16px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-size:15px;font-weight:700">${trust.html(squad.productName)}</div>
            <div style="font-size:12px;color:var(--txt3);margin-top:2px">Code : <strong style="color:var(--accent);font-family:monospace">${trust.html(squad.squadId || '—')}</strong></div>
          </div>
          <div style="background:rgba(255,92,43,.1);border:1px solid rgba(255,92,43,.2);border-radius:10px;padding:6px 12px;text-align:center">
            <div style="font-size:16px;font-weight:700;color:var(--accent)">${squad.currentCount}/${squad.targetCount}</div>
            <div style="font-size:10px;color:var(--txt3)">membres</div>
          </div>
        </div>
        <div class="squad-bar"><div class="squad-bar-fill" style="width:${pct}%"></div></div>
        <div style="font-size:11px;color:var(--txt3);margin-bottom:14px">${pct}% atteint · Plus que ${remaining} personne(s) !</div>
        <button type="button" data-squad-share class="squad-share-btn">📤 Partager le Squad</button>
      </div>
    `;

    const shareButton = card.querySelector('[data-squad-share]');
    if (shareButton) {
      shareButton.addEventListener('click', function() {
        if (navigator.share) {
          navigator.share({ title: 'Deal Squad Julvox', text: 'Rejoins mon Deal Squad pour obtenir une remise !', url: squad.shareUrl }).catch(function() {});
        } else {
          copyToClipboard(squad.shareUrl);
        }
      });
    }
  }
}

function runtimeSource() {
  const source = injectedDealSquadRuntime.toString();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('P6.37 injected runtime source malformed');
  return source.slice(start + 1, end).trim() + '\n\n';
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) throw new Error('P6.37 Deal Squad renderer anchors missing');
  const original = html.slice(start, end);
  for (const expected of [
    "${data.product_name || 'Produit'}",
    "url:'${data.share_url||'https://julvox.com'}'",
    "copyToClipboard('${data.share_url||'https://julvox.com'}')",
  ]) {
    if (!original.includes(expected)) throw new Error(`P6.37 expected Deal Squad sink missing: ${expected}`);
  }
  const output = html.slice(0, start) + runtimeSource() + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const count = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (count !== 1) throw new Error(`P6.37 marker count must be 1, got ${count}`);
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error('P6.37 hardened Deal Squad block missing');
  const block = html.slice(start, end);
  for (const bad of [
    "${data.product_name || 'Produit'}",
    "url:'${data.share_url||'https://julvox.com'}'",
    "copyToClipboard('${data.share_url||'https://julvox.com'}')",
    'onclick="navigator.share',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.37 Deal Squad sink remains: ${bad}`);
  }
  for (const required of [
    'trust.html(squad.productName)',
    'trust.httpUrl(input.share_url',
    'data-squad-share',
    "shareButton.addEventListener('click'",
    'Number.isSafeInteger(n)',
    '/^[A-Z0-9_-]{1,32}$/.test(rawSquadId)',
  ]) {
    if (!block.includes(required)) throw new Error(`P6.37 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_37_DEAL_SQUAD_DOM_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact, runtimeSource };
