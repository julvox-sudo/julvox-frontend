'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_48_COMMUNITY_SUBMISSION_TRUTH';

const COPY_REPLACEMENTS = [
  [
    'Partage un bon deal avec la communauté. Le score Julvox sera calculé automatiquement.',
    'Partage une offre avec la communauté. Elle reste en attente de validation communautaire ; aucun score Julvox n’est inventé à partir de la seule soumission.',
    'automatic Julvox score claim',
  ],
  [
    `<button onclick="submitCommunityDealNew()" style="width:100%;background:linear-gradient(135deg,var(--accent),var(--a2));color:#fff;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif">
        🚀 Publier le deal
      </button>`,
    `<button id="submitCommunityDealButton" onclick="submitCommunityDealNew()" style="width:100%;background:linear-gradient(135deg,var(--accent),var(--a2));color:#fff;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif">
        🚀 Soumettre le deal
      </button>`,
    'publish button claim',
  ],
  [
    'Les deals sont vérifiés par Julvox avant publication.',
    'Les soumissions restent en attente jusqu’à leur validation communautaire ; elles ne sont pas présentées comme vérifiées par Julvox.',
    'Julvox pre-publication verification claim',
  ],
  [
    "['property','og:title','Julvox by Julvox — Deals vérifiés Julvox']",
    "['property','og:title','Julvox — Deals et offres analysés par Julvox']",
    'global verified-deals OpenGraph claim',
  ],
];

const CLOSE_SUBMIT_ANCHOR = `function closeSubmitDeal(e) {
  if (!e || e.target === document.getElementById('submitDealOverlay') || !e.target) {
    document.getElementById('submitDealOverlay').classList.remove('open');
  }
}
`;

const SUBMIT_RUNTIME = `${CLOSE_SUBMIT_ANCHOR}
let _communitySubmitBusy = false;

async function submitCommunityDealNew() {
  if (_communitySubmitBusy) return;
  const token = (typeof currentUser !== 'undefined' && currentUser && typeof currentUser.token === 'string') ? currentUser.token.trim() : '';
  if (!token) { showToast('⚠️ Connecte-toi pour soumettre un deal'); return; }

  const field = function(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; };
  const productName = field('sdName');
  const price = Number(field('sdPrice'));
  const originalText = field('sdOriginal');
  const originalPrice = originalText ? Number(originalText) : null;
  const store = field('sdStore');
  const category = field('sdCat');
  const productUrl = field('sdUrl');
  const description = field('sdDesc');

  if (!productName || productName.length > 300) { showToast('⚠️ Renseigne un nom de produit valide'); return; }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) { showToast('⚠️ Renseigne un prix valide'); return; }
  if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice <= 0 || originalPrice > 1000000)) { showToast('⚠️ Renseigne un prix original valide'); return; }
  if (!store || store.length > 160) { showToast('⚠️ Renseigne le marchand'); return; }
  if (description.length > 1200) { showToast('⚠️ La description est trop longue'); return; }

  let parsedUrl;
  try { parsedUrl = new URL(productUrl); } catch (_) { showToast('⚠️ Renseigne un lien marchand valide'); return; }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
    showToast('⚠️ Le lien doit être une URL HTTP(S) sans identifiants');
    return;
  }

  const button = document.getElementById('submitCommunityDealButton');
  _communitySubmitBusy = true;
  if (button) button.disabled = true;
  try {
    const result = await window.JULVOX_API.post('/community/submit-deal', {
      product_name: productName,
      url: parsedUrl.href,
      price,
      original_price: originalPrice,
      store,
      category,
      description,
    }, {
      token,
      confirm: data => Number.isSafeInteger(Number(data?.submission_id)) && Number(data.submission_id) > 0
        && data?.status === 'pending' && Number(data?.score) === 0,
    });

    if (!result.ok) {
      showToast('⚠️ ' + (result.message || 'Soumission indisponible. Réessaie plus tard.'));
      return;
    }

    ['sdName','sdPrice','sdOriginal','sdStore','sdUrl','sdDesc'].forEach(function(id) {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cat = document.getElementById('sdCat'); if (cat) cat.value = '';
    closeSubmitDeal();
    showToast('✅ Deal soumis — en attente de validation communautaire');
    if (typeof switchCommTab === 'function') switchCommTab('mine');
  } finally {
    _communitySubmitBusy = false;
    if (button) button.disabled = false;
  }
}
`;

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = source.split(legacy).length - 1;
  if (count !== 1) throw new Error(`P6.48 expected exactly one ${label}, got ${count}`);
  return source.replace(legacy, replacement);
}

function hardenHtml(html) {
  if (html.includes(`/* ${MARKER} */`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  for (const [legacy, replacement, label] of COPY_REPLACEMENTS) {
    output = replaceExactlyOnce(output, legacy, replacement, label);
  }
  output = replaceExactlyOnce(output, CLOSE_SUBMIT_ANCHOR, `/* ${MARKER} */\n${SUBMIT_RUNTIME}`, 'community submit runtime anchor');
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.48 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'Le score Julvox sera calculé automatiquement.',
    '🚀 Publier le deal',
    'Les deals sont vérifiés par Julvox avant publication.',
    'Deals vérifiés Julvox',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.48 unsupported community submission claim remains: ${unsupported}`);
  }

  for (const required of [
    '🚀 Soumettre le deal',
    'validation communautaire',
    'aucun score Julvox n’est inventé à partir de la seule soumission',
    "window.JULVOX_API.post('/community/submit-deal'",
    "data?.status === 'pending'",
    'Number(data?.score) === 0',
    "token,",
    "showToast('✅ Deal soumis — en attente de validation communautaire')",
    "switchCommTab('mine')",
    "['property','og:title','Julvox — Deals et offres analysés par Julvox']",
  ]) {
    if (!html.includes(required)) throw new Error(`P6.48 required community submission truth path missing: ${required}`);
  }

  const submitDefinitions = html.match(/async function submitCommunityDealNew\s*\(/g) || [];
  if (submitDefinitions.length !== 1) throw new Error(`P6.48 submitCommunityDealNew definition count must be 1, got ${submitDefinitions.length}`);
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_48_COMMUNITY_SUBMISSION_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
