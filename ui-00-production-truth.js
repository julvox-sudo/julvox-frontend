(function initProductionTruth(globalObject, factory) {
  const exported = factory(globalObject);
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (globalObject && typeof globalObject === 'object') {
    Object.defineProperty(globalObject, 'JULVOX_PRODUCTION_TRUTH', {
      value: exported,
      writable: false,
      configurable: true,
      enumerable: true,
    });
  }
})(typeof window !== 'undefined' ? window : globalThis, function createProductionTruth(globalObject) {
  'use strict';

  const VALID_CAPABILITY_STATUSES = Object.freeze([
    'supported', 'partial', 'experimental', 'unavailable', 'demo-only',
  ]);
  const STATUS_LABELS = Object.freeze({
    supported: 'Disponible',
    partial: 'Disponibilité partielle',
    experimental: 'Expérimental',
    unavailable: 'Indisponible',
    'demo-only': 'Démonstration',
  });
  const getRuntime = () => globalObject?.JULVOX_RUNTIME_CONFIG || null;
  const getCapabilities = () => getRuntime()?.application?.capabilities || {};
  function getCapabilityStatus(name) {
    const status = getCapabilities()?.[name]?.status;
    return VALID_CAPABILITY_STATUSES.includes(status) ? status : 'unavailable';
  }
  const isDemoMode = () => getRuntime()?.runtime?.environment === 'demo';
  function isCapabilityAvailable(name) {
    const status = getCapabilityStatus(name);
    if (status === 'unavailable') return false;
    if (status === 'demo-only') return isDemoMode();
    return true;
  }
  function applyCapabilityState(element, name) {
    if (!element) return null;
    const status = getCapabilityStatus(name);
    element.dataset.capability = name;
    element.dataset.capabilityStatus = status;
    element.setAttribute('data-capability-label', STATUS_LABELS[status]);
    if (status === 'unavailable' || (status === 'demo-only' && !isDemoMode())) {
      if ('disabled' in element) element.disabled = true;
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.hidden = false;
      element.removeAttribute('aria-hidden');
      if (status !== 'supported') element.setAttribute('aria-description', STATUS_LABELS[status]);
    }
    return status;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function renderState(element, kind, message, retry) {
    if (!element) return;
    const button = typeof retry === 'function'
      ? '<button type="button" data-ui00-retry style="margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--txt);cursor:pointer">Réessayer</button>'
      : '';
    element.innerHTML = `<div data-ui00-state="${kind}" style="text-align:center;padding:24px;color:var(--txt2)"><div style="font-size:24px;margin-bottom:8px">${kind === 'empty' ? '∅' : '⚠️'}</div><div>${escapeHtml(message)}</div>${button}</div>`;
    if (button) element.querySelector('[data-ui00-retry]')?.addEventListener('click', retry, { once: true });
  }
  async function runConfirmedMutation({ operation, onPending, onSuccess, onError, rollback }) {
    if (typeof operation !== 'function') throw new TypeError('operation must be a function');
    onPending?.();
    let result;
    try { result = await operation(); }
    catch (_) { result = { ok: false, status: 0, kind: 'network-error', message: 'Connexion au service impossible.' }; }
    if (result?.ok) { onSuccess?.(result); return result; }
    rollback?.(result);
    onError?.(result);
    return result;
  }
  const api = () => globalObject?.JULVOX_API || null;
  const currentToken = () => globalObject?.currentUser?.token || globalObject?.localStorage?.getItem?.('token') || null;
  const toast = message => globalObject?.showToast?.(message);
  const errorMessage = (result, fallback) => result?.message || fallback;

  function installMutationOverrides() {
    const client = api();
    if (!client) return;

    globalObject.createAlert = async function(name, price) {
      const token = currentToken();
      if (!token) { toast('⚠️ Connecte-toi pour créer une alerte'); globalObject.openAuth?.('login'); return; }
      const result = await client.post('/alerts/smart', {
        product_name: name,
        target_price: Number.isFinite(Number(price)) ? Number(price) : undefined,
      }, { token, confirm: data => Number.isInteger(data?.alert_id) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Création de l’alerte impossible.')}`); return; }
      toast(`🔔 ${result.data?.message || 'Alerte créée.'}`);
      globalObject.closeModal?.();
    };
    globalObject.createSmartAlertForDeal = globalObject.createAlert;

    globalObject.deleteAlert = async function(id, button) {
      const original = button?.textContent;
      if (button) { button.disabled = true; button.textContent = '…'; }
      const result = await client.delete(`/alerts/${id}`, { token: currentToken(), confirm: data => Boolean(data?.message) });
      if (!result.ok) {
        if (button) { button.disabled = false; button.textContent = original || 'Supprimer'; }
        toast(`❌ ${errorMessage(result, 'Suppression de l’alerte impossible.')}`);
        return;
      }
      button?.closest?.('.alert-item')?.remove();
      toast('✅ Alerte supprimée');
    };

    globalObject.voteDeal = async function(id, vote) {
      const token = currentToken();
      if (!token) { toast('👤 Connecte-toi pour voter'); globalObject.openAuth?.('login'); return; }
      const result = await client.post(`/deals/${id}/vote`, { vote }, {
        token,
        confirm: data => Number.isFinite(data?.up) && Number.isFinite(data?.down),
      });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Vote non enregistré.')}`); return; }
      globalObject.updateVoteUI?.(id, result.data);
      globalObject.document?.getElementById?.(`voteUp_${id}`)?.classList.toggle('active', result.data.my_vote === 'up');
      globalObject.document?.getElementById?.(`voteDn_${id}`)?.classList.toggle('active', result.data.my_vote === 'down');
      toast('✅ Avis enregistré');
    };

    globalObject.submitCommunityDealNew = async function() {
      if (!globalObject.currentUser) { toast('⚠️ Connecte-toi pour soumettre'); globalObject.openAuth?.('login'); return; }
      const doc = globalObject.document;
      const name = doc?.getElementById('sdName')?.value?.trim();
      const price = Number.parseFloat(doc?.getElementById('sdPrice')?.value);
      const originalPrice = Number.parseFloat(doc?.getElementById('sdOriginal')?.value) || null;
      const store = doc?.getElementById('sdStore')?.value?.trim();
      const category = doc?.getElementById('sdCategory')?.value || '';
      const url = doc?.getElementById('sdUrl')?.value?.trim();
      const description = doc?.getElementById('sdDesc')?.value?.trim();
      if (!name || !Number.isFinite(price) || price <= 0) { toast('⚠️ Nom et prix valides requis'); return; }
      const button = doc?.querySelector('#submitDealOverlay .modal-body button');
      const originalLabel = button?.textContent;
      if (button) { button.disabled = true; button.textContent = '⏳ Publication…'; }
      const result = await client.post('/community/submit-deal', {
        product_name: name, price, original_price: originalPrice, store, category, url, description,
      }, { token: currentToken(), confirm: data => Number.isInteger(data?.submission_id) });
      if (button) { button.disabled = false; button.textContent = originalLabel || '🚀 Publier le deal'; }
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Soumission impossible.')}`); return; }
      globalObject.closeSubmitDeal?.();
      ['sdName','sdPrice','sdOriginal','sdStore','sdUrl','sdDesc'].forEach(id => { const el = doc?.getElementById(id); if (el) el.value = ''; });
      toast(result.data?.message || '✅ Deal soumis pour modération.');
      globalObject.switchCommTab?.('deals');
    };

    globalObject.voteCommDeal = async function(id, type, button) {
      if (!globalObject.currentUser) { toast('⚠️ Connecte-toi pour voter'); globalObject.openAuth?.('login'); return; }
      const previous = globalObject._commVotes?.[id];
      const result = await client.post(`/community/deals/${id}/vote`, {
        vote_type: type, remove: previous === type,
      }, { token: currentToken(), confirm: data => Number.isFinite(data?.votes_validate) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Vote communautaire non enregistré.')}`); return; }
      if (globalObject._commVotes) {
        if (previous === type) delete globalObject._commVotes[id];
        else globalObject._commVotes[id] = type;
      }
      button?.closest?.('.comm-deal-card')?.querySelectorAll?.('.comm-vote-btn')?.forEach?.(node => node.classList.remove('voted'));
      if (globalObject._commVotes?.[id]) button?.classList?.add('voted');
      toast('✅ Vote communautaire enregistré');
    };

    async function publishComment(path, input, reload) {
      const text = input?.value?.trim();
      if (!text) return;
      if (!globalObject.currentUser) { toast('⚠️ Connecte-toi pour commenter'); globalObject.openAuth?.('login'); return; }
      const result = await client.post(path, { content: text }, {
        token: currentToken(), confirm: data => Boolean(data?.comment_id || data?.message),
      });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Commentaire non publié.')}`); return; }
      input.value = '';
      await reload?.();
      toast('💬 Commentaire publié');
    }
    globalObject.postDealComment = dealId => publishComment(
      `/deals/${dealId}/comments`,
      globalObject.document?.getElementById(`dealCommentInput_${dealId}`),
      () => globalObject.loadDealComments?.(dealId),
    );
    globalObject.postCommComment = dealId => publishComment(
      `/community/deals/${dealId}/comments`,
      globalObject.document?.getElementById('commCommentInput'),
      () => globalObject.loadCommComments?.(dealId),
    );

    globalObject.submitReport = async function() {
      if (!globalObject.reportReason) return;
      const result = await client.post(`/deals/${globalObject.reportDealId}/report`, {
        reason: globalObject.reportReason, deal_id: globalObject.reportDealId,
      }, { token: currentToken(), confirm: data => Boolean(data?.message || data?.report_id || data?.status) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Signalement non envoyé.')}`); return; }
      globalObject.closeReport?.();
      toast('✅ Signalement envoyé.');
    };

    globalObject.createSquad = async function() {
      const token = currentToken();
      if (!token) { toast('⚠️ Connecte-toi pour créer un squad'); return; }
      const doc = globalObject.document;
      const result = await client.post('/squad/create', {
        product_name: doc?.getElementById('squadProduct')?.value?.trim(),
        target_count: Number.parseInt(doc?.getElementById('squadTargetCount')?.value || '2', 10),
        target_price: Number.parseFloat(doc?.getElementById('squadTargetPrice')?.value) || null,
        store: doc?.getElementById('squadStore')?.value?.trim(),
      }, { token, confirm: data => typeof data?.squad_id === 'string' && data.squad_id.length > 0 });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Création du squad impossible.')}`); return; }
      toast(`✅ Squad créé. Code : ${result.data.squad_id}`);
      globalObject.renderActiveSquad?.(result.data);
    };

    globalObject.joinSquad = async function() {
      const token = currentToken();
      if (!token) { toast('⚠️ Connecte-toi pour rejoindre un squad'); return; }
      const code = globalObject.document?.getElementById('joinSquadCode')?.value?.trim().toUpperCase();
      if (!code) { toast('⚠️ Entre un code Squad'); return; }
      const result = await client.post(`/squad/${encodeURIComponent(code)}/join`, {}, {
        token, confirm: data => Boolean(data?.squad_id || data?.progress || data?.message),
      });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Impossible de rejoindre ce squad.')}`); return; }
      toast(result.data?.message || '✅ Squad rejoint.');
      globalObject.renderActiveSquad?.(result.data);
    };

    globalObject.addToWishlist = async function() {
      const token = currentToken();
      if (!token) { toast('⚠️ Connecte-toi pour utiliser la wishlist'); return; }
      const doc = globalObject.document;
      const name = doc?.getElementById('wishName')?.value?.trim();
      if (!name) { toast('⚠️ Nom du produit requis'); return; }
      const result = await client.post('/wishlist', {
        name,
        current_price: Number.parseFloat(doc?.getElementById('wishCurrentPrice')?.value) || null,
        target_price: Number.parseFloat(doc?.getElementById('wishTargetPrice')?.value) || null,
      }, { token, confirm: data => Number.isInteger(data?.item?.id) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Ajout à la wishlist impossible.')}`); return; }
      ['wishName','wishCurrentPrice','wishTargetPrice'].forEach(id => { const el = doc?.getElementById(id); if (el) el.value = ''; });
      toast('✅ Ajouté à la wishlist');
      globalObject.loadWishlistItems?.();
    };
    globalObject.removeFromWishlist = async function(id) {
      const result = await client.delete(`/wishlist/${id}`, { token: currentToken(), confirm: data => Boolean(data?.message) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Retrait de la wishlist impossible.')}`); return; }
      toast('✅ Retiré de la wishlist');
      globalObject.loadWishlistItems?.();
    };

    globalObject.subscribeNewsletter = async function() {
      const doc = globalObject.document;
      const email = doc?.getElementById('newsletterEmail')?.value?.trim();
      if (!email || !email.includes('@')) { toast('⚠️ Email invalide'); return; }
      const result = await client.post('/newsletter/subscribe', {
        email,
        frequency: globalObject._buildFrequencyPayload?.() || { type: 'daily', hour: 8 },
        source: 'homepage_footer',
      }, { confirm: data => Boolean(data?.status || data?.message || data?.subscriber_id) });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Inscription à la newsletter impossible.')}`); return; }
      const form = doc?.getElementById('newsletterForm');
      const ok = doc?.getElementById('newsletterOk');
      if (form) form.style.display = 'none';
      if (ok) ok.style.display = 'block';
      toast('📬 Inscription enregistrée. Vérifiez votre email si une confirmation est requise.');
    };

    globalObject.enableNotifPermission = async function() {
      if (!('Notification' in globalObject) || !globalObject.navigator?.serviceWorker) {
        toast('❌ Notifications non prises en charge par ce navigateur'); return;
      }
      const permission = await globalObject.Notification.requestPermission();
      if (permission !== 'granted') { toast('❌ Permission de notification refusée'); return; }
      toast('1/3 — Permission navigateur accordée');
      const registration = globalObject.swRegistration || await globalObject.navigator.serviceWorker.ready;
      const keyResult = await client.get('/push/vapid-public-key');
      if (!keyResult.ok || !keyResult.data?.public_key) { toast('❌ Clé de notification indisponible. Aucun abonnement créé.'); return; }
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: globalObject.urlBase64ToUint8Array(keyResult.data.public_key),
        });
      } catch (_) { toast('❌ Abonnement navigateur impossible'); return; }
      toast('2/3 — Abonnement navigateur créé');
      const token = currentToken();
      if (!token) { toast('⚠️ Connecte-toi pour enregistrer l’abonnement sur Julvox'); return; }
      const backendResult = await client.post('/push/subscribe', { subscription: subscription.toJSON() }, {
        token, confirm: data => data?.status === 'subscribed',
      });
      if (!backendResult.ok) {
        try { await subscription.unsubscribe(); } catch (_) {}
        toast(`❌ ${errorMessage(backendResult, 'Enregistrement backend impossible.')}`);
        return;
      }
      toast('3/3 — Notifications enregistrées sur Julvox');
      globalObject.renderNotifsPage?.();
    };

    globalObject.deleteAccount = async function() {
      if (!globalObject.currentUser) return;
      const result = await client.delete('/account/delete', {
        token: currentToken(), confirm: data => data?.rgpd === true,
      });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Suppression du compte impossible.')}`); return; }
      globalObject.logout?.();
      globalObject.closePage?.('accountPage');
      toast(result.data?.message || '✅ Demande de suppression enregistrée.');
    };

    globalObject.votePromo = async function(id, type, button) {
      if (!globalObject.currentUser) { toast('⚠️ Connecte-toi pour voter'); globalObject.openAuth?.('login'); return; }
      const result = await client.post(`/promos/${id}/vote`, { vote_type: type }, {
        token: currentToken(), confirm: data => Boolean(data?.status || Number.isFinite(data?.votes_ok) || data?.message),
      });
      if (!result.ok) { toast(`❌ ${errorMessage(result, 'Vote sur le code promo non enregistré.')}`); return; }
      button?.classList?.add('voted');
      toast(type === 'ok' ? '✅ Vote enregistré' : '⚠️ Signalement enregistré');
      globalObject.loadAndRenderPromos?.();
    };
  }

  function applyKnownCapabilitySurfaces() {
    const selectors = {
      scanner: ['#scannerPage', '[onclick*="openScanner"]', '[onclick*="openBarcode"]'],
      ai: ['#aiChatPage', '[onclick*="openAIChat"]'],
      recommendations: ['[onclick*="Recommendations"]', '[onclick*="recommendation"]'],
      pro_api: ['#proPage', '[onclick*="openPro"]'],
      gamification: ['#achievementsPage', '#missionsPage', '[onclick*="Achievements"]'],
      reports: ['#reportPage', '[onclick*="MonthlyReport"]'],
    };
    for (const [name, values] of Object.entries(selectors)) {
      for (const selector of values) {
        globalObject.document?.querySelectorAll?.(selector)?.forEach?.(element => applyCapabilityState(element, name));
      }
    }
  }
  function install() {
    applyKnownCapabilitySurfaces();
    installMutationOverrides();
    globalObject.document?.querySelectorAll?.('[data-capability]')?.forEach?.(element => {
      applyCapabilityState(element, element.dataset.capability);
    });
  }
  if (globalObject?.document) {
    if (globalObject.document.readyState === 'loading') globalObject.document.addEventListener('DOMContentLoaded', install, { once: true });
    else install();
  }
  return Object.freeze({
    VALID_CAPABILITY_STATUSES, STATUS_LABELS, getCapabilityStatus, isCapabilityAvailable,
    isDemoMode, applyCapabilityState, renderState, runConfirmedMutation, install,
  });
});
