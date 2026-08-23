'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = 'async function openAccountPage() {';
const END = 'async function savePseudo() {';
const MARKER = 'P6_32_ACCOUNT_HTML_TRUST';

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) return html;

  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.32 account hardening could not locate openAccountPage block');
  }

  let block = html.slice(start, end);
  const anchor = `  const initials = currentUser.name.charAt(0).toUpperCase();\n  const since    = new Date(profile.member_since).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});`;
  if (!block.includes(anchor)) {
    throw new Error('P6.32 account normalization anchor missing');
  }

  for (const sink of [
    '${currentUser.name}',
    '${profile.email}',
    '${profile.alerts_limit}',
    'deleteAlert(${a.id},this)',
    '${a.target_price}€',
  ]) {
    if (!block.includes(sink)) throw new Error(`P6.32 expected account sink missing: ${sink}`);
  }

  const normalization = `  // ${MARKER}\n  const accountTrust = window.JulvoxDynamicDealTrust;\n  if (!accountTrust) { body.textContent = 'Compte indisponible'; return; }\n  const accountNameText = accountTrust.text(currentUser.name || profile.name || '', 160) || 'Utilisateur';\n  const accountEmailText = accountTrust.text(profile.email || currentUser.email || '', 254);\n  const accountNameHtml = accountTrust.html(accountNameText);\n  const accountEmailHtml = accountTrust.html(accountEmailText);\n  const accountInitialHtml = accountTrust.html(accountNameText.charAt(0).toUpperCase() || 'U');\n  const rawAlertLimit = Number(profile.alerts_limit);\n  const accountAlertLimit = Number.isFinite(rawAlertLimit) ? Math.max(0, Math.trunc(rawAlertLimit)) : 0;\n  profile.is_premium = profile.is_premium === true;\n  alerts = (Array.isArray(alerts) ? alerts : []).map(function(alert) {\n    const id = accountTrust.positiveId(alert && alert.id);\n    if (!id) return null;\n    const target = Number(alert && alert.target_price);\n    return {\n      id,\n      product_name: accountTrust.text(alert && alert.product_name, 200),\n      target_price: Number.isFinite(target) && target > 0 ? target : null,\n    };\n  }).filter(Boolean);\n  const initials = accountInitialHtml;\n  const since = new Date(profile.member_since).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});`;

  block = block
    .replace(anchor, normalization)
    .replaceAll('${currentUser.name}', '${accountNameHtml}')
    .replaceAll('${profile.email}', '${accountEmailHtml}')
    .replaceAll('${profile.alerts_limit}', '${accountAlertLimit}')
    .replace('${escHtml(currentUser.name)}', '${accountNameHtml}');

  const output = html.slice(0, start) + block + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0) throw new Error('P6.32 hardened account block missing');
  const block = html.slice(start, end);

  if (!block.includes(`// ${MARKER}`)) throw new Error('P6.32 marker missing');
  for (const bad of [
    '${currentUser.name}',
    '${profile.email}',
    '${profile.alerts_limit}',
    '${escHtml(currentUser.name)}',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.32 unsafe account sink remains: ${bad}`);
  }

  for (const required of [
    "accountTrust.text(currentUser.name || profile.name || '', 160)",
    "accountTrust.text(profile.email || currentUser.email || '', 254)",
    'accountTrust.positiveId(alert && alert.id)',
    'Number(alert && alert.target_price)',
    'const accountNameHtml = accountTrust.html(accountNameText)',
    'const accountEmailHtml = accountTrust.html(accountEmailText)',
  ]) {
    if (!block.includes(required)) throw new Error(`P6.32 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_32_ACCOUNT_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
