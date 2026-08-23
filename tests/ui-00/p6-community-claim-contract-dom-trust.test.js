'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-community-claim-html');

const fixture = `<!doctype html><html><body><script>
async function loadCommDeals(sort, el) {
  const result = await window.JULVOX_API.get('/community/deals', {isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0});
  renderCommDeals(result.data.deals, el, sort);
}
async function loadMyCommDeals(el) {
  const result = await window.JULVOX_API.get('/community/my-deals', {isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0});
  renderCommDeals(result.data.deals, el, 'mine');
}
async function loadCommLeader(el) {}
function renderCommDeals(deals, el, sort) { el.innerHTML = deals.map(d => renderCommDealCard(d)).join(''); }
function renderCommDealCard(d) {
  return \`<div id="commCard_\${d.id}"><button onclick="voteCommDeal(\${d.id},'validate',this)">vote</button><button onclick="openCommComments(\${d.id},'\${escHtml(d.product_name||'Deal')}')">comment</button></div>\`;
}
// ── Vote on a community deal ──
function voteCommDeal() {}
</script></body></html>`;

function scriptSource(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/i);
  return match ? match[1] : '';
}

function trustStub() {
  return {
    positiveId(value) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : 0; },
    text(value, limit) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 1200); },
    html(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); },
    httpUrl(value) { try { const u = new URL(String(value)); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } },
  };
}

test('P6.35 accepts canonical claims payload and removes dynamic community handlers', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.match(hardened, /Array\.isArray\(data\.claims\)/);
  assert.match(hardened, /input\.claimed_price/);
  assert.match(hardened, /input\.claimed_store/);
  assert.match(hardened, /input\.moderation_status/);
  assert.doesNotMatch(hardened, /onclick="voteCommDeal\(\$\{d\.id\}/);
  assert.doesNotMatch(hardened, /onclick="openCommComments\(\$\{d\.id\}/);
  assert.match(hardened, /data-comm-vote-id/);
  assert.match(hardened, /data-comm-comments-id/);
  new vm.Script(scriptSource(hardened));
});

test('P6.35 normalizes attacker-controlled community claim text without JS serialization', () => {
  const hardened = hardenHtml(fixture);
  const context = {
    window: { JulvoxDynamicDealTrust: trustStub() },
    URL,
    Object,
    Number,
    Math,
    Array,
  };
  vm.createContext(context);
  vm.runInContext(scriptSource(hardened), context);
  const payload = {
    claims: [{
      id: 7,
      product_name: `TV');globalThis.pwned=1;// <img src=x onerror=alert(1)>`,
      claimed_price: 399.99,
      claimed_original_price: 499.99,
      claimed_store: `<img src=x onerror=alert(2)>`,
      url: 'javascript:alert(3)',
      moderation_status: 'approved',
      market_fact_status: 'community_claim_unverified',
      description: '<svg/onload=alert(4)>',
      votes_validate: 2,
    }],
  };
  const normalized = context.normalizeCommunityClaims(payload);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, 7);
  assert.equal(normalized[0].url, '');
  assert.equal(normalized[0].price, 399.99);
  assert.equal(normalized[0].store, '<img src=x onerror=alert(2)>');
  assert.equal(normalized[0].market_fact_status, 'community_claim_unverified');
  assert.match(normalized[0].product_name, /globalThis\.pwned/);
  assert.doesNotMatch(hardened, /product_name[^\n]{0,120}onclick/);
  assert.match(hardened, /trust\.html\(d\.product_name\)/);
});

test('P6.35 preserves community claims as unverified instead of fabricating a Julvox score', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /Déclaration communautaire · non vérifiée/);
  assert.match(hardened, /d\.market_fact_status !== 'community_claim_unverified'/);
  assert.match(hardened, /score: Number\.isFinite\(Number\(input\.score\)\)/);
});

test('P6.35 is wired after P6.34 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const wishlistCall = csp.indexOf('hardenWishlistHtml();');
  const communityCall = csp.indexOf('hardenCommunityClaimHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(wishlistCall >= 0 && communityCall > wishlistCall && readCall > communityCall);
});
