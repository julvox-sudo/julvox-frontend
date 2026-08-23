'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_42_COOKIE_CONSENT_LOCAL_TRUTH';
const ACCEPT_START = 'function acceptCookies(choice) {';
const ACCEPT_END = 'function hideCookieBanner() {';

const TRUTHFUL_ACCEPT_BLOCK = `// ${MARKER}
function acceptCookies(choice) {
  const localChoice = choice === true ? 'yes' : 'no';
  let stored = false;
  try {
    localStorage.setItem('ds_cookie', localChoice);
    stored = localStorage.getItem('ds_cookie') === localChoice;
  } catch(e) {}
  if (!stored) {
    showToast('⚠️ Impossible d’enregistrer ce choix cookies sur cet appareil');
    return;
  }
  hideCookieBanner();
  showToast(choice === true
    ? '✅ Choix cookies enregistré sur cet appareil : mesures d’audience autorisées'
    : '✅ Choix cookies enregistré sur cet appareil : mesures d’audience refusées');
}

`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }

  const start = html.indexOf(ACCEPT_START);
  const end = html.indexOf(ACCEPT_END, start + ACCEPT_START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.42 cookie consent anchors missing');
  }

  const legacy = html.slice(start, end);
  for (const required of [
    "localStorage.setItem('ds_cookie'",
    "showToast(choice ? '✅ Cookies acceptés' : '✅ Cookies refusés')",
    '/account/cookie-consent',
    'session_id:Math.random().toString(36).slice(2)',
  ]) {
    if (!legacy.includes(required)) {
      throw new Error(`P6.42 expected legacy cookie consent behavior missing: ${required}`);
    }
  }

  const output = html.slice(0, start) + TRUTHFUL_ACCEPT_BLOCK + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.42 marker count must be 1, got ${markerCount}`);
  }

  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(ACCEPT_END, start);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.42 truthful cookie consent block missing');
  }
  const block = html.slice(start, end);

  for (const bad of [
    '/account/cookie-consent',
    '✅ Cookies acceptés',
    '✅ Cookies refusés',
    'session_id:',
  ]) {
    if (block.includes(bad)) {
      throw new Error(`P6.42 misleading server-consent behavior remains: ${bad}`);
    }
  }

  for (const required of [
    "localStorage.setItem('ds_cookie', localChoice)",
    "localStorage.getItem('ds_cookie') === localChoice",
    'Choix cookies enregistré sur cet appareil',
    'Impossible d’enregistrer ce choix cookies sur cet appareil',
    'function resetCookieConsent()',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.42 required local cookie behavior missing: ${required}`);
    }
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_42_COOKIE_CONSENT_LOCAL_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
