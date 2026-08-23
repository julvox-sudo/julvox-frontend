'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-deal-squad-html');

const fixture = `<!doctype html><html><body><script>
function renderActiveSquad(data) {
  document.getElementById('activeSquadCard').innerHTML = \`<div>\${data.product_name || 'Produit'}<strong>\${data.squad_id}</strong><button onclick="navigator.share ? navigator.share({title:'Deal Squad Julvox',text:'Rejoins mon Deal Squad pour obtenir une remise !',url:'\${data.share_url||'https://julvox.com'}'}) : copyToClipboard('\${data.share_url||'https://julvox.com'}')">Partager</button></div>\`;
}
function copyToClipboard(text) {}
</script></body></html>`;

function scriptSource(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/i);
  return match ? match[1] : '';
}

function trustStub() {
  return {
    text(value, limit) { return String(value == null ? '' : value).trim().slice(0, limit); },
    html(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); },
    httpUrl(value) { try { const url = new URL(String(value)); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; } },
  };
}

test('P6.37 removes raw Deal Squad product and share-url handler sinks', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /\$\{data\.product_name/);
  assert.doesNotMatch(hardened, /onclick="navigator\.share/);
  assert.match(hardened, /trust\.html\(squad\.productName\)/);
  assert.match(hardened, /data-squad-share/);
  new vm.Script(scriptSource(hardened));
});

test('P6.37 normalizes hostile user-controlled Deal Squad payloads', () => {
  const hardened = hardenHtml(fixture);
  const context = { window: { JulvoxDynamicDealTrust: trustStub() }, URL, Number, Math, Object };
  vm.createContext(context);
  vm.runInContext(scriptSource(hardened), context);
  const normalized = context.normalizeDealSquadView({
    product_name: '<img src=x onerror=globalThis.pwned=1>',
    squad_id: "X' onclick='pwn",
    target_count: 5000,
    current_count: -7,
    share_url: 'javascript:alert(1)',
  });
  assert.equal(normalized.productName, '<img src=x onerror=globalThis.pwned=1>');
  assert.equal(normalized.squadId, '');
  assert.equal(normalized.targetCount, 1000);
  assert.equal(normalized.currentCount, 0);
  assert.equal(normalized.shareUrl, 'https://julvox.com/');
});

test('P6.37 preserves valid server-generated Deal Squad fields', () => {
  const hardened = hardenHtml(fixture);
  const context = { window: { JulvoxDynamicDealTrust: trustStub() }, URL, Number, Math, Object };
  vm.createContext(context);
  vm.runInContext(scriptSource(hardened), context);
  const normalized = context.normalizeDealSquadView({
    product_name: 'TV OLED',
    squad_id: 'ABCD_123',
    target_count: 10,
    current_count: 3,
    share_url: 'https://julvox.com/?squad=ABCD_123',
  });
  assert.equal(normalized.productName, 'TV OLED');
  assert.equal(normalized.squadId, 'ABCD_123');
  assert.equal(normalized.targetCount, 10);
  assert.equal(normalized.currentCount, 3);
  assert.match(normalized.shareUrl, /^https:\/\/julvox\.com\//);
});

test('P6.37 is wired after P6.36 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const wishlistCall = csp.indexOf('reconcileWishlistActivePath();');
  const squadCall = csp.indexOf('hardenDealSquadHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(wishlistCall >= 0 && squadCall > wishlistCall && readCall > squadCall);
});
