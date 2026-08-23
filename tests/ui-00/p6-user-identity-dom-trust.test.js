'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-user-identity-dom');

const fixture = `<!doctype html><html><body><script>
function updateNavForUser() {
  const area=document.getElementById('authNavArea');
  if (currentUser) {
    area.innerHTML=\`<button class="user-btn" onclick="toggleDropdown()"><div class="avatar">\${currentUser.name.charAt(0).toUpperCase()}</div><span>\${currentUser.name}\${currentUser.is_premium?' 👑':''}</span></button>\`;
    document.getElementById('ddName').textContent=currentUser.name+(currentUser.is_premium?' 👑':'');
    document.getElementById('ddEmail').textContent=currentUser.email;
  } else {
    area.innerHTML=\`<button class="user-btn" onclick="openAuth('login')">Connexion</button>\`;
  }
}
function toggleDropdown() {}
</script></body></html>`;

function inlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1] || '')) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.31 removes currentUser identity from innerHTML and inline handlers', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const start = hardened.indexOf('// P6_31_USER_IDENTITY_DOM_TRUST');
  const end = hardened.indexOf('function toggleDropdown()', start);
  const block = hardened.slice(start, end);
  assert.doesNotMatch(block, /area\.innerHTML/);
  assert.doesNotMatch(block, /onclick=/);
  assert.doesNotMatch(block, /\$\{currentUser\.name\}/);
  assert.match(block, /avatar\.textContent/);
  assert.match(block, /label\.textContent/);
  assert.match(block, /addEventListener\('click'/);
  for (const source of inlineScripts(hardened)) new vm.Script(source);
});

test('P6.31 bounds profile text through existing trust authority', () => {
  const hardened = hardenHtml(fixture);
  const start = hardened.indexOf('// P6_31_USER_IDENTITY_DOM_TRUST');
  const end = hardened.indexOf('function toggleDropdown()', start);
  const block = hardened.slice(start, end);
  assert.match(block, /trust\.text\(currentUser\.name, 160\)/);
  assert.match(block, /trust\.text\(currentUser\.email, 254\)/);
});

test('P6.31 is wired after P6.30 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const compareCall = csp.indexOf('hardenDynamicCompareHtml();');
  const identityCall = csp.indexOf('hardenUserIdentityDom();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(compareCall >= 0 && identityCall > compareCall && readCall > identityCall);
});
