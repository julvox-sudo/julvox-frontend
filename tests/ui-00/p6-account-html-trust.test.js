'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-account-html');

const fixture = `<!doctype html><html><body><script>
async function openAccountPage() {
  const body = document.getElementById('accountBody');
  let profile = {email: currentUser.email, name: currentUser.name, is_premium:false, alerts_limit:5, member_since:new Date().toISOString()};
  let alerts = [{id:"1);alert(1);//", product_name:"<img src=x onerror=alert(1)>", target_price:"<svg/onload=alert(1)>"}];
  const initials = currentUser.name.charAt(0).toUpperCase();
  const since    = new Date(profile.member_since).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
  body.innerHTML = \`<div><span>\${initials}</span><strong>\${currentUser.name}</strong><em>\${profile.email}</em><input value="\${escHtml(currentUser.name)}"><i>\${profile.alerts_limit}</i>\${alerts.map(a => \`<div>\${escHtml(a.product_name)} \${a.target_price}€ <button onclick="deleteAlert(\${a.id},this)">x</button></div>\`).join('')}</div>\`;
}
async function savePseudo() {}
</script></body></html>`;

function scripts(html) {
  const values = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1] || '')) continue;
    values.push(match[2] || '');
  }
  return values;
}

test('P6.32 normalizes account identity and alert scalars before HTML', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const start = hardened.indexOf('async function openAccountPage() {');
  const end = hardened.indexOf('async function savePseudo() {', start);
  const block = hardened.slice(start, end);
  assert.match(block, /P6_32_ACCOUNT_HTML_TRUST/);
  assert.doesNotMatch(block, /\$\{currentUser\.name\}/);
  assert.doesNotMatch(block, /\$\{profile\.email\}/);
  assert.doesNotMatch(block, /\$\{profile\.alerts_limit\}/);
  assert.match(block, /accountTrust\.positiveId\(alert && alert\.id\)/);
  assert.match(block, /Number\(alert && alert\.target_price\)/);
  assert.match(block, /accountNameHtml/);
  assert.match(block, /accountEmailHtml/);
  for (const source of scripts(hardened)) new vm.Script(source);
});

test('P6.32 bounds profile text through existing trust authority', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /accountTrust\.text\(currentUser\.name \|\| profile\.name \|\| '', 160\)/);
  assert.match(hardened, /accountTrust\.text\(profile\.email \|\| currentUser\.email \|\| '', 254\)/);
});

test('P6.32 is wired after P6.31 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const identityCall = csp.indexOf('hardenUserIdentityDom();');
  const accountCall = csp.indexOf('hardenAccountHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(identityCall >= 0 && accountCall > identityCall && readCall > accountCall);
});
