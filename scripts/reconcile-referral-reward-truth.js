'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_40_REFERRAL_REWARD_TRUTH';
const START = 'async function openReferralPage() {';
const SPLIT = '// Vérifier code parrainage au chargement';
const AUTO_APPLY = 'if (ref && currentUser) setTimeout(() => applyReferralCode(ref), 1000);';

function referralRuntime() {
  // P6_40_REFERRAL_REWARD_TRUTH
  function normalizeReferralView(input) {
    const trust = window.JulvoxDynamicDealTrust;
    if (!trust || !input || typeof input !== 'object') return null;
    const code = trust.text(input.code, 32).toUpperCase();
    if (!/^[A-Z0-9_-]{1,32}$/.test(code)) return null;
    const rawUses = Number(input.uses);
    const uses = Number.isSafeInteger(rawUses) && rawUses >= 0 ? Math.min(rawUses, 1000000) : 0;
    const rewardStatus = trust.text(input.reward_status, 80);
    const earnedDays = Number(input.earned_days);
    return {
      code,
      uses,
      rewardStatus,
      earnedDays: Number.isSafeInteger(earnedDays) && earnedDays >= 0 ? earnedDays : 0,
    };
  }

  async function fetchReferralState() {
    if (!currentUser?.token) return null;
    const headers = {'Authorization': `Bearer ${currentUser.token}`};
    let statsResponse;
    try {
      statsResponse = await window.JULVOX_API.fetchResponse(`${API}/referral/stats`, {headers});
    } catch (_) {
      return null;
    }
    if (!statsResponse.ok) return null;
    let stats;
    try { stats = await statsResponse.json(); } catch (_) { return null; }

    if (!stats?.code) {
      let generatedResponse;
      try {
        generatedResponse = await window.JULVOX_API.fetchResponse(`${API}/referral/generate`, {
          method: 'POST',
          headers,
        });
      } catch (_) {
        return null;
      }
      if (!generatedResponse.ok) return null;
      try { await generatedResponse.json(); } catch (_) { return null; }

      try {
        statsResponse = await window.JULVOX_API.fetchResponse(`${API}/referral/stats`, {headers});
        if (!statsResponse.ok) return null;
        stats = await statsResponse.json();
      } catch (_) {
        return null;
      }
    }
    return normalizeReferralView(stats);
  }

  async function openReferralPage() {
    if (!currentUser) { openAuth('login'); return; }
    const body = document.getElementById('referralBody');
    if (!body) return;
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt3)">Chargement…</div>';
    openPage('referralPage');

    const state = await fetchReferralState();
    if (!state) {
      body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--txt2)">Parrainage temporairement indisponible. Aucun code local n’a été fabriqué.</div>';
      return;
    }

    const trust = window.JulvoxDynamicDealTrust;
    const suspended = state.rewardStatus === 'suspended_pending_durable_entitlement' && state.earnedDays === 0;
    if (!trust || !suspended) {
      body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--txt2)">Le statut actuel des récompenses de parrainage ne peut pas être confirmé depuis cette version de Julvox.</div>';
      return;
    }

    body.innerHTML = `
      <div style="padding:20px">
        <div class="ref-hero">
          <div style="font-size:40px;margin-bottom:10px">🎁</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:6px">Parrainage temporairement suspendu</div>
          <div style="font-size:14px;opacity:.85">Les codes restent enregistrés, mais aucune récompense Premium n’est actuellement attribuée.</div>
        </div>
        <div class="ref-code-box">
          <div style="font-size:13px;color:var(--txt2);margin-bottom:4px">Ton code enregistré</div>
          <div class="ref-code">${trust.html(state.code)}</div>
          <div style="font-size:12px;color:var(--txt3);margin-bottom:14px">Utilisations enregistrées : ${state.uses} · Récompense Premium : suspendue</div>
          <button type="button" class="ref-copy-btn" data-ref-copy>📋 Copier mon code</button>
        </div>
        <div style="background:rgba(255,184,0,.08);border:1px solid rgba(255,184,0,.2);border-radius:12px;padding:13px 14px;font-size:12px;color:var(--txt2);line-height:1.45">
          L’utilisation d’un code ne déclenche actuellement aucun avantage Premium. Julvox réactivera ce parcours uniquement lorsqu’un registre durable d’entitlements pourra confirmer la récompense.
        </div>
      </div>`;

    body.querySelector('[data-ref-copy]')?.addEventListener('click', () => copyRefCode(state.code));
  }

  function copyRefCode(code) {
    const trust = window.JulvoxDynamicDealTrust;
    const safe = trust ? trust.text(code, 32).toUpperCase() : '';
    if (!/^[A-Z0-9_-]{1,32}$/.test(safe)) return;
    navigator.clipboard.writeText(safe).then(() => {
      showToast('📋 Code copié. Les récompenses de parrainage sont actuellement suspendues.');
    }).catch(() => showToast('❌ Copie du code impossible'));
  }

  async function applyReferralCode() {
    showToast('ℹ️ Les récompenses de parrainage sont actuellement suspendues. Aucun code n’a été appliqué.');
    return false;
  }
}

function runtimeSource() {
  const source = String(referralRuntime);
  const open = source.indexOf('{');
  const close = source.lastIndexOf('}');
  if (open < 0 || close <= open) throw new Error('P6.40 runtime source extraction failed');
  return source.slice(open + 1, close).trim() + '\n\n';
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }

  const start = html.indexOf(START);
  const split = html.indexOf(SPLIT, start + START.length);
  if (start < 0 || split < 0 || split <= start) throw new Error('P6.40 referral anchors missing');

  const legacy = html.slice(start, split);
  for (const required of [
    'uses * 7',
    '// Code local',
    'btoa(currentUser.email)',
    "copyRefCode('${code}','${refLink}')",
    '/referral/use/${code}',
    'Invite & Gagne Premium',
    '7 jours Premium',
  ]) {
    if (!legacy.includes(required)) throw new Error(`P6.40 expected legacy referral behavior missing: ${required}`);
  }

  let output = html.slice(0, start) + runtimeSource() + html.slice(split);
  const autoCount = output.split(AUTO_APPLY).length - 1;
  if (autoCount !== 2) throw new Error(`P6.40 expected two automatic referral applications, got ${autoCount}`);
  output = output.split(AUTO_APPLY).join('// Referral reward auto-application disabled while durable entitlements are suspended.');

  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.40 marker count must be 1, got ${markerCount}`);

  const start = html.indexOf(`// ${MARKER}`);
  const split = html.indexOf(SPLIT, start);
  if (start < 0 || split < 0) throw new Error('P6.40 hardened referral block missing');
  const block = html.slice(start, split);

  for (const bad of [
    'uses * 7',
    'btoa(currentUser.email)',
    'Invite & Gagne Premium',
    '7 jours Premium',
    '/referral/use/',
    'wa.me/?text=',
    'onclick="copyRefCode',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.40 stale referral claim remains: ${bad}`);
  }
  for (const required of [
    '/referral/stats',
    '/referral/generate',
    'suspended_pending_durable_entitlement',
    'Aucun code local n’a été fabriqué',
    'data-ref-copy',
    'Récompense Premium : suspendue',
    'Aucun code n’a été appliqué',
    'trust.html(state.code)',
  ]) {
    if (!block.includes(required)) throw new Error(`P6.40 missing ${required}`);
  }
  if (html.includes(AUTO_APPLY)) throw new Error('P6.40 automatic referral application remains');
  if (!html.includes("if (premium === 'success' && currentUser && currentUser.token)")) {
    throw new Error('P6.40 payment premium verification flow was lost');
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_40_REFERRAL_REWARD_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact, runtimeSource };
