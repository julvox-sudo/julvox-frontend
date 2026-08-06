(function initUi00MutationInstaller(globalObject, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (globalObject && typeof globalObject === 'object') Object.defineProperty(globalObject, 'JULVOX_INSTALL_UI00_MUTATIONS', {
    value: exported, writable: false, configurable: false, enumerable: false,
  });
})(typeof window !== 'undefined' ? window : globalThis, function createMutationInstaller() {
  'use strict';
  return function installMutationOverrides(context) {
    const { globalObject, api, token, toast, errorMessage, identifier, statusIn, deletion, locked, auth } = context;
        const client = api();
        if (!client)
            return;
        globalObject.createAlert = (name, price) => locked(`alert:create:${String(name)}`, async () => {
            const bearer = auth('⚠️ Connecte-toi pour créer une alerte');
            if (!bearer)
                return null;
            const result = await client.post('/alerts/smart', { product_name: name, target_price: Number.isFinite(Number(price)) ? Number(price) : undefined }, { token: bearer, confirm: data => identifier(data?.alert_id) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Création de l’alerte impossible.')}`), result;
            toast('🔔 Alerte créée.');
            globalObject.closeModal?.();
            return result;
        });
        globalObject.createSmartAlertForDeal = globalObject.createAlert;
        globalObject.deleteAlert = (id, button) => locked(`alert:delete :${id}`, async () => {
            const original = button?.textContent;
            if (button) {
                button.disabled = true;
                button.textContent = '…';
            }
            const result = await client.delete(`/alerts/${encodeURIComponent(id)}`, { token: token(), confirm: deletion });
            if (!result.ok) {
                if (button) {
                    button.disabled = false;
                    button.textContent = original || 'Supprimer';
                }
                toast(`❌${errorMessage(result,'Suppression de l’alerte impossible.')}`);
                return result;
            }
            button?.closest?.('.alert-item')?.remove();
            toast('✅ Alerte supprimée');
            return result;
        });
        globalObject.voteDeal = (id, vote) => locked(`deal:vote:${id}`, async () => {
            const bearer = auth('👤 Connecte-toi pour voter');
            if (!bearer)
                return null;
            const result = await client.post(`/deals/${encodeURIComponent(id)}/vote`, { vote }, { token: bearer, confirm: data => Number.isFinite(data?.up) && Number.isFinite(data?.down) && ['up', 'down', null].includes(data?.my_vote ?? null) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Vote non enregistré.')}`), result;
            globalObject.updateVoteUI?.(id, result.data);
            toast('✅ Avis enregistré');
            return result;
        });
        globalObject.submitCommunityDealNew = () => locked('community:submit', async () => {
            const bearer = auth('⚠️ Connecte-toi pour soumettre');
            if (!bearer)
                return null;
            const doc = globalObject.document;
            const name = doc?.getElementById('sdName')?.value?.trim();
            const price = Number.parseFloat(doc?.getElementById('sdPrice')?.value);
            if (!name || !Number.isFinite(price) || price <= 0)
                return toast('⚠️ Nom et prix valides requis'), null;
            const button = doc?.querySelector('#submitDealOverlay .modal-body button');
            const label = button?.textContent;
            if (button) {
                button.disabled = true;
                button.textContent = '⏳ Publication…';
            }
            const result = await client.post('/community/submit-deal', {
                product_name: name, price,
                original_price: Number.parseFloat(doc?.getElementById('sdOriginal')?.value) || null,
                store: doc?.getElementById('sdStore')?.value?.trim(), category: doc?.getElementById('sdCategory')?.value || '',
                url: doc?.getElementById('sdUrl')?.value?.trim(), description: doc?.getElementById('sdDesc')?.value?.trim(),
            }, { token: bearer, confirm: data => identifier(data?.submission_id) });
            if (button) {
                button.disabled = false;
                button.textContent = label || '🚀 Publier le deal';
            }
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Soumission impossible.')}`), result;
            globalObject.closeSubmitDeal?.();
            toast('✅ Deal soumis pour modération.');
            globalObject.switchCommTab?.('deals');
            return result;
        });
        globalObject.voteCommDeal = (id, type, button) => locked(`community:vote:${id}`, async () => {
            const bearer = auth('⚠️ Connecte-toi pour voter');
            if (!bearer)
                return null;
            const previous = globalObject._commVotes?.[id];
            const result = await client.post(`/community/deals/${encodeURIComponent(id)}/vote`, { vote_type: type, remove: previous === type }, { token: bearer, confirm: data => Number.isFinite(data?.votes_validate) && Number.isFinite(data?.votes_reject) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Vote communautaire non enregistré.')}`), result;
            if (globalObject._commVotes) {
                if (previous === type)
                    delete globalObject._commVotes[id];
                else
                    globalObject._commVotes[id] = type;
            }
            button?.classList?.toggle?.('voted', globalObject._commVotes?.[id] === type);
            toast('✅ Vote communautaire enregistré');
            return result;
        });
        const publishComment = (path, input, reload) => locked(`comment:${path}`, async () => {
            const text = input?.value?.trim();
            if (!text)
                return null;
            const bearer = auth('⚠️ Connecte-toi pour commenter');
            if (!bearer)
                return null;
            const result = await client.post(path, { content: text }, { token: bearer, confirm: data => identifier(data?.comment_id) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Commentaire non publié.')}`), result;
            input.value = '';
            await reload?.();
            toast('💬 Commentaire publié');
            return result;
        });
        globalObject.postDealComment = id => publishComment(`/deals/${encodeURIComponent(id)}/comments`, globalObject.document?.getElementById(`dealCommentInput_${id}`), () => globalObject.loadDealComments?.(id));
        globalObject.postCommComment = id => publishComment(`/community/deals/${encodeURIComponent(id)}/comments`, globalObject.document?.getElementById('commCommentInput'), () => globalObject.loadCommComments?.(id));
        globalObject.submitReport = () => locked(`report:${globalObject.reportDealId}`, async () => {
            if (!globalObject.reportReason)
                return null;
            const result = await client.post(`/deals/${encodeURIComponent(globalObject.reportDealId)}/report`, { reason: globalObject.reportReason, deal_id: globalObject.reportDealId }, { token: token(), confirm: data => identifier(data?.report_id) || statusIn(data, ['reported', 'received', 'accepted']) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Signalement non envoyé.')}`), result;
            globalObject.closeReport?.();
            toast('✅ Signalement envoyé.');
            return result;
        });
        globalObject.createSquad = () => locked('squad:create', async () => {
            const bearer = auth('⚠️ Connecte-toi pour créer un squad');
            if (!bearer)
                return null;
            const doc = globalObject.document;
            const result = await client.post('/squad/create', {
                product_name: doc?.getElementById('squadProduct')?.value?.trim(), target_count: Number.parseInt(doc?.getElementById('squadTargetCount')?.value || '2', 10),
                target_price: Number.parseFloat(doc?.getElementById('squadTargetPrice')?.value) || null, store: doc?.getElementById('squadStore')?.value?.trim(),
            }, { token: bearer, confirm: data => identifier(data?.squad_id) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Création du squad impossible.')}`), result;
            toast(`✅Squad créé.Code:${result.data.squad_id}`);
            globalObject.renderActiveSquad?.(result.data);
            return result;
        });
        globalObject.joinSquad = () => locked('squad:join', async () => {
            const bearer = auth('⚠️ Connecte-toi pour rejoindre un squad');
            if (!bearer)
                return null;
            const code = globalObject.document?.getElementById('joinSquadCode')?.value?.trim().toUpperCase();
            if (!code)
                return toast('⚠️ Entre un code Squad'), null;
            const result = await client.post(`/squad/${encodeURIComponent(code)}/join`, {}, { token: bearer, confirm: data => identifier(data?.squad_id) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Impossible de rejoindre ce squad.')}`), result;
            toast('✅ Squad rejoint.');
            globalObject.renderActiveSquad?.(result.data);
            return result;
        });
        globalObject.addToWishlist = () => locked('wishlist:add', async () => {
            const bearer = auth('⚠️ Connecte-toi pour utiliser la wishlist');
            if (!bearer)
                return null;
            const doc = globalObject.document;
            const name = doc?.getElementById('wishName')?.value?.trim();
            if (!name)
                return toast('⚠️ Nom du produit requis'), null;
            const result = await client.post('/wishlist', { name, current_price: Number.parseFloat(doc?.getElementById('wishCurrentPrice')?.value) || null, target_price: Number.parseFloat(doc?.getElementById('wishTargetPrice')?.value) || null }, { token: bearer, confirm: data => identifier(data?.item?.id) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Ajout à la wishlist impossible.')}`), result;
            toast('✅ Ajouté à la wishlist');
            globalObject.loadWishlistItems?.();
            return result;
        });
        globalObject.removeFromWishlist = id => locked(`wishlist:delete :${id}`, async () => {
            const result = await client.delete(`/wishlist/${encodeURIComponent(id)}`, { token: token(), confirm: deletion });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Retrait de la wishlist impossible.')}`), result;
            toast('✅ Retiré de la wishlist');
            globalObject.loadWishlistItems?.();
            return result;
        });
        globalObject.subscribeNewsletter = () => locked('newsletter:subscribe', async () => {
            const doc = globalObject.document;
            const email = doc?.getElementById('newsletterEmail')?.value?.trim();
            if (!email || !email.includes('@'))
                return toast('⚠️ Email invalide'), null;
            const result = await client.post('/newsletter/subscribe', { email, frequency: globalObject._buildFrequencyPayload?.() || { type: 'daily', hour: 8 }, source: 'homepage_footer' }, { confirm: data => identifier(data?.subscriber_id) || statusIn(data, ['subscribed', 'pending_confirmation', 'already_subscribed']) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Inscription à la newsletter impossible.')}`), result;
            const form = doc?.getElementById('newsletterForm');
            const ok = doc?.getElementById('newsletterOk');
            if (form)
                form.style.display = 'none';
            if (ok)
                ok.style.display = 'block';
            toast('📬 Inscription enregistrée. Vérifiez votre email si une confirmation est requise.');
            return result;
        });
        globalObject.enableNotifPermission = () => locked('push:subscribe', async () => {
            if (!('Notification' in globalObject) || !globalObject.navigator?.serviceWorker)
                return toast('❌ Notifications non prises en charge par ce navigateur'), null;
            if (await globalObject.Notification.requestPermission() !== 'granted')
                return toast('❌ Permission de notification refusée'), null;
            const registration = globalObject.swRegistration || await globalObject.navigator.serviceWorker.ready;
            const key = await client.get('/push/vapid-public-key');
            if (!key.ok || typeof key.data?.public_key !== 'string' || !key.data.public_key)
                return toast('❌ Clé de notification indisponible. Aucun abonnement créé.'), key;
            let subscription;
            try {
                subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: globalObject.urlBase64ToUint8Array(key.data.public_key) });
            }
            catch (_) {
                return toast('❌ Abonnement navigateur impossible'), null;
            }
            const bearer = token();
            if (!bearer) {
                try {
                    await subscription.unsubscribe();
                }
                catch (_) { }
                toast('⚠️ Connecte-toi pour enregistrer l’abonnement sur Julvox');
                return null;
            }
            const result = await client.post('/push/subscribe', { subscription: subscription.toJSON() }, { token: bearer, confirm: data => data?.status === 'subscribed' });
            if (!result.ok) {
                try {
                    await subscription.unsubscribe();
                }
                catch (_) { }
                toast(`❌${errorMessage(result,'Enregistrement backend impossible.')}`);
                return result;
            }
            toast('✅ Notifications enregistrées sur Julvox');
            globalObject.renderNotifsPage?.();
            return result;
        });
        globalObject.deleteAccount = () => locked('account:delete', async () => {
            if (!globalObject.currentUser)
                return null;
            const result = await client.delete('/account/delete', { token: token(), confirm: (data, response) => response?.status === 204 || data?.rgpd === true });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Suppression du compte impossible.')}`), result;
            globalObject.logout?.();
            globalObject.closePage?.('accountPage');
            toast('✅ Demande de suppression enregistrée.');
            return result;
        });
        globalObject.votePromo = (id, type, button) => locked(`promo:vote:${id}`, async () => {
            const bearer = auth('⚠️ Connecte-toi pour voter');
            if (!bearer)
                return null;
            const result = await client.post(`/promos/${encodeURIComponent(id)}/vote`, { vote_type: type }, { token: bearer, confirm: data => (Number.isFinite(data?.votes_ok) && Number.isFinite(data?.votes_ko)) || (type === 'ok' ? statusIn(data, ['voted']) : statusIn(data, ['reported'])) });
            if (!result.ok)
                return toast(`❌${errorMessage(result,'Vote sur le code promo non enregistré.')}`), result;
            button?.classList?.add('voted');
            toast(type === 'ok' ? '✅ Vote enregistré' : '⚠️ Signalement enregistré');
            globalObject.loadAndRenderPromos?.();
            return result;
        });
  };
});
