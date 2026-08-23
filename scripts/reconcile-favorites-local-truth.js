'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_41_FAVORITES_LOCAL_TRUTH';
const FAVORITES_PAGE_ANCHOR = '<div class="page-body"><div id="favGrid" class="deals" style="padding:0"></div></div>';

const LOCAL_TRUTH_NOTE = `<div data-p6-favorites-local-truth="1" style="margin:0 0 14px;padding:11px 13px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:12px;line-height:1.45;color:var(--txt2)">
      ❤️ Tes favoris sont enregistrés uniquement sur cet appareil. La synchronisation entre appareils n’est pas encore disponible.
    </div>`;

const REPLACEMENTS = Object.freeze([
  ['Retrouve tes favoris sur tous tes appareils', 'Connecte-toi à ton compte Julvox'],
  ['Gratuit · Favoris synchronisés · Alertes prix', 'Gratuit · Favoris locaux · Alertes prix'],
  ['✅ Favoris synchronisés', '✅ Favoris sur cet appareil'],
  ['✅ Favoris sync', '✅ Favoris sur cet appareil'],
]);

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  if (!html.includes(FAVORITES_PAGE_ANCHOR)) {
    throw new Error('P6.41 favorites page anchor missing');
  }

  let output = html.replace(
    FAVORITES_PAGE_ANCHOR,
    `<!-- ${MARKER} -->\n  <div class="page-body">${LOCAL_TRUTH_NOTE}<div id="favGrid" class="deals" style="padding:0"></div></div>`,
  );

  for (const [legacy, truthful] of REPLACEMENTS) {
    if (!output.includes(legacy)) {
      throw new Error(`P6.41 expected legacy favorites claim missing: ${legacy}`);
    }
    output = output.split(legacy).join(truthful);
  }

  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) {
    throw new Error(`P6.41 marker count must be 1, got ${markerCount}`);
  }

  for (const legacy of [
    'Favoris synchronisés',
    'Favoris sync',
    'favoris sur tous tes appareils',
  ]) {
    if (html.includes(legacy)) {
      throw new Error(`P6.41 misleading favorites synchronization claim remains: ${legacy}`);
    }
  }

  for (const required of [
    'Tes favoris sont enregistrés uniquement sur cet appareil',
    'La synchronisation entre appareils n’est pas encore disponible',
    'Gratuit · Favoris locaux · Alertes prix',
    '✅ Favoris sur cet appareil',
    "localStorage.getItem('ds_favs'",
    "localStorage.setItem('ds_favs'",
    'function toggleFav(id)',
    'function openFavPage()',
  ]) {
    if (!html.includes(required)) {
      throw new Error(`P6.41 required favorites local behavior missing: ${required}`);
    }
  }

  if (html.includes('/account/favorites')) {
    throw new Error('P6.41 must not invent unavailable server favorites synchronization');
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_41_FAVORITES_LOCAL_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
